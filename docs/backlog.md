# FoodRank backlog

Fixes and features found during the review of the frontend, one step per Claude Code session and per branch.

**How to use it:** create a branch from `main`, open a fresh session (`/clear`), switch to plan mode and say:

> Read `docs/backlog.md` and do step **N**.

Tick the box once the step is merged. The steps are independent, except: step 7 needs step 6 (it uses the decisions recorded there), and step 9 comes after step 8 (both change the Explore cards).

## Progress

- [x] 1. Loading, error and not-found states
- [x] 2. Auth error messages
- [x] 3. Password rules on the password reset
- [ ] 4. Logged-in user and duplicate requests
- [ ] 5. Opening a restaurant from a search result
- [ ] 6. Add restaurants to a tierlist: decisions and API
- [ ] 7. Add restaurants to a tierlist: frontend
- [ ] 8. Explore suggestions from the API
- [ ] 9. Navigation links and accessibility
- [ ] 10. Code hygiene

## Rules for every step

1. Follow the root `CLAUDE.md` for the app(s) the step touches: check the prerequisites, load the skills it names (`angular-developer` for `apps/frontend`, `dotnet-best-practices` for `apps/api`), and follow `apps/frontend/CLAUDE.md` for the frontend.
2. When the step lists **decisions**, ask the user in plan mode before writing code, then record the answers under the step.
3. Write the tests with the code (see the root `CLAUDE.md`). Run `npm run test:front` for a frontend-only step, `npm test` when the API is touched; for the frontend, also `npm run lint --prefix apps/frontend` and `npm run build --prefix apps/frontend`. All must pass before proposing the result.
4. Generate new Angular code with the CLI (`ng generate ...`), then fill it in.
5. No new dependency without asking first.
6. **Final summary**: tests added or changed, test run result, what was not done as planned, and the manual checks to do in the browser (`npm start`). Tick the step and suggest the commit message given in the step (repo style: `type (scope): message`).

---

## Steps

### 1. Loading, error and not-found states (findings 2, 3, 7, 8)

Frontend only. Every page must end up showing its content, an error or a redirect, never a blank screen or an endless loader.

- **`NewReview`**: show the 🍽️ loader while loading, as the restaurant page does. On a server error, show a `role="alert"` message (`Couldn't load this restaurant, try again.`).
- **`Profile`**: show an error message when the profile fails to load. When only the ranking fails, show `Couldn't load the ratings` instead of "No restaurant rated yet".
- **`Home`**: the user bar skeleton must not stay forever when the profile fails.
- **Unknown URLs**: add a `**` route as the last route.
- **`Explore`**: don't wait for the geolocation without limit before showing the suggestions.
- **New review sheet**: only show "No restaurants found" once the current query has actually been searched, not during the debounce.
- **Decisions**:
  - `NewReview`: if `/users/me/ratings` fails, show the sliders without markers (load the ratings separately from the restaurant), or show the error?
  - `Home`: when the profile fails, hide the user bar or show an error?
  - `**` route: redirect to `/` (the access guard then sends logged-out users to `/login`), or a "page not found" page?
  - Explore: show the list unsorted right away and sort it once the position arrives, or wait for the position with a timeout?
- **Decisions taken**:
  - `NewReview`: the restaurant and the ratings load separately. A failing restaurant shows `Couldn't load this restaurant, try again later.` (`role="alert"`) with a "Go back" link to the page of the restaurant being rated. Failing ratings don't block the page: the sliders work without markers, and a notice says the past reviews couldn't be loaded.
  - `Home`: when the profile fails, show an error in place of the user bar.
  - `**` route: a "page not found" page with a link to the home page.
  - Explore: wait for the position for at most 3 seconds, then show the list in the API order (it is still sorted if the position arrives later).
- Tests: one per changed behavior (error message shown, unknown URL redirected, no "No restaurants found" during the debounce, Explore list shown without a position).
- Commit: `fix (frontend): loading, error and not-found states`

### 2. Auth error messages (findings 9, 10, 18)

Frontend only.

- **Login**: say `Invalid email or password.` only for a 401 (or 400). For any other error, say `Something went wrong. Please try again.`, as the forgot password form does.
- **Unreachable 401 messages**: remove the 401 branches of `saveErrorMessage` in `new-review.ts` and `tierlist-create.ts` (the 401 interceptor already logs the user out), and the tests that cover them. Say so in the summary.
- **Signup draft**: don't keep the typed password in memory once the user leaves the sign up.
- **Decision**: when the user leaves the sign up for the login tab, clear only the password, or the whole draft? Keeping the email matches what the user expects when switching back and forth between the tabs.
- **Decision taken**: leaving the sign up (the Sign in tab, the back button or any other URL) empties the whole draft, email included. Going back and forth between the sign up steps keeps it.
- Tests: login with a 500 and with no network; draft password cleared.
- Commit: `fix (frontend): auth error messages`

### 3. Password rules on the password reset (finding 4)

API + frontend. A reset password must follow the same rules as a signup password.

- **API**: add `[StrongPassword]` to `ResetPasswordRequest.Password`, so a weak password gets a 400. Turn a Supabase failure in `ResetPasswordAsync` into a proper status instead of a 500. Add tests in `AuthControllerTests`.
- **Frontend**: in `ResetPasswordForm`, reuse `PasswordCriteria` and the `isValidPassword` validation of the signup password step, and keep the button disabled until the password is valid. Map the statuses to messages: 400 → the password rules, 401 → `The link may have expired`, anything else → a generic error.
- Run `npm test` (API + front).
- **Done**: an invalid or expired link → 401, a password Supabase refuses → 400 (`SamePassword` for the current password, `PasswordRefused` for its own policy), an outage → 503. On a 400 that carries an `{ error }` message (Supabase's refusal), the form shows that message instead of the password rules.
- Commit: `fix (auth): apply the password rules to the password reset`

### 4. Logged-in user and duplicate requests (findings 5, 12)

Frontend only. Recognize the logged-in user through `AuthStore.loggedInUserId`, and load each piece of data once per page.

- **`/user/<my id>`**: treat it as my own profile (no "my score", no rate buttons, no second ratings request).
- **`RestaurantRatingsTabs`**: get my id from `AuthStore.loggedInUserId` instead of `myRatings[0]`.
- **`Home`**: one `/users/me/ratings` request, shared by the recent reviews and the favorites.
- **`TierlistDetail`**: when I own the tierlist, reuse the owner's ratings as my ratings instead of requesting them twice.
- **Decision**: for `/user/<my id>`, redirect to `/profile` (one URL for my profile), or render it as my own profile in place?
- Tests: request counts (`HttpTestingController` or the call counts of the fakes), own profile reached by its id.
- Commit: `fix (frontend): recognize the logged-in user and drop duplicate requests`

### 5. Opening a restaurant from a search result (finding 11)

Frontend only. Creating the restaurant (`POST /api/restaurants/from-place`) must not run inside an `rxResource`, and the restaurant and its ratings must be loaded only once.

- Move the creation out of `RestaurantDetail`, so that it only handles `restaurant/:id`.
- Keep the current behavior on failure: `Couldn't load this restaurant` with a "Go back" button.
- **Decision**: where should the creation run?
  - a functional guard on `restaurant/place/:placeId` that POSTs and returns a `UrlTree` to `/restaurant/:id` (no extra page instance, but the error then needs its own page or route);
  - or the search sheet and the search results create the restaurant before navigating (the `restaurant/place/:placeId` route goes away).
- Tests: with `RouterTestingHarness`, one POST, one restaurant GET and one set of rating requests; the error case.
- Commit: `refactor (frontend): create the restaurant from a place outside the page resource`

### 6. Add restaurants to a tierlist: decisions and API (findings 1, 6)

A new feature, split in two steps (API here, frontend in step 7) to keep each session focused. Start in plan mode and take the decisions with the user, then record them here for step 7.

- **Decisions**:
  - Where does the user add a restaurant: from the tierlist page (a picker), from the restaurant page ("Add to a tierlist"), or both?
  - Which restaurants can be added: any restaurant, or only the ones the owner has rated?
  - Can a restaurant be removed from a tierlist?
  - Finding 6: which count does the app show, all the restaurants of the tierlist or only the rated ones? It must be the same on the card and on the detail page. If unrated restaurants are allowed, how does the detail page show them?
- **API**: endpoints to add and remove a restaurant, for example `POST /api/tierlists/{id}/restaurants` `{ restaurantId }` and `DELETE /api/tierlists/{id}/restaurants/{restaurantId}`. Owner only (403 otherwise), 404 for an unknown tierlist or restaurant, 409 when it is already in the tierlist. Update `updated_at`. Add controller tests for every status.
- Run `npm run test:api`.
- Commit: `feat (api): add and remove restaurants of a tierlist`

### 7. Add restaurants to a tierlist: frontend (findings 1, 6)

Frontend part of step 6, following the decisions recorded there.

- `TierlistApi` methods for the new endpoints, and the UI where the decisions put it.
- The same restaurant count on `TierlistCard` and `TierlistDetail` (finding 6).
- The detail page shows an empty state when the tierlist has no restaurant.
- Tests: add, remove, owner only, errors, counts.
- Run `npm test` (the API contract used by the frontend changes).
- Commit: `feat (frontend): add and remove restaurants of a tierlist`

### 8. Explore suggestions from the API (finding 13)

API + frontend. Explore must stop downloading every restaurant to show 5.

- **API**: an endpoint returning the suggestions of the logged-in user, for example `GET /api/restaurants/suggestions?lat&lon&limit=5`: restaurants the user hasn't rated, nearest first, restaurants without coordinates last (the `PlaceRanking` rule). Add tests.
- **Frontend**: `Explore` uses it. Remove `nearbyUnvisited` and the client-side join. Keep the current behavior (no coordinates: sorted last, cuisine shown instead of the distance) and its test.
- **Decisions**:
  - Does the API return the distance, or does the frontend keep computing it for display?
  - Without a position, which order?
- Run `npm test`.
- Commit: `feat (explore): suggest restaurants from the API`

### 9. Navigation links and accessibility (findings 15, 16)

Frontend only. Do it after step 8, which also changes the Explore cards.

- Use `<a routerLink>` instead of a `<button>` calling `router.navigateByUrl` for every navigation: `UserBar`, the home settings button, the Explore cards, the search result items and the "New" chip of the tierlists page. The look must not change. `NewChip` stays a button where it opens the new review sheet.
- `RankedRestaurantItem`: move the rate button out of the link (a real `<button>`, placed next to it) so that no interactive element is nested in another.
- Tests: the links have the right `href`. Update the existing click tests.
- Commit: `fix (frontend): use links for navigation`

### 10. Code hygiene (findings 14, 17, 19)

Frontend only, no behavior change.

- Move `NewReviewStore` out of `features/review` (to `core/`), so that `shared/` and `layout/` no longer import from a feature.
- `RecentReviewCard` uses `ratingAverage()`.
- Keep the test helpers (`core/auth/auth-testing.ts`, `testing/dom-testing.ts`) out of the app build: exclude them in `tsconfig.app.json`, or rename them to a pattern it already excludes.
- The existing tests must pass unchanged, apart from the imports.
- Commit: `refactor (frontend): layering and test helpers`

---

## Findings

Found during a review of the whole frontend. Each finding is fixed by one of the [steps](#steps), which name the findings they cover.

**Bugs a user can hit**

1. **Tierlists stay empty.** There is no way to add a restaurant to a tierlist: no UI and no API endpoint (`TierlistsController` only has create, get and pin). The detail page ranks restaurants that can never be added.
2. **Pages left blank on a load error** (the tierlist page already shows a `role="alert"` message in this case):
   - `NewReview` shows nothing while loading and stays blank forever on a server error (`@if (restaurant())` only). Since it uses `forkJoin`, a failing `/users/me/ratings` call also blanks the page.
   - `Profile`: if the profile fails to load, the page is blank. If the ranking fails, it says "No restaurant rated yet". `user.loadError` and `ranking.loadError` are never shown.
   - `Home`: if the profile fails, the user bar skeleton stays forever.
3. **No wildcard route.** An unknown URL (e.g. `/foo`) fails the navigation and shows a blank page.
4. **The password reset skips the password rules.** The reset form doesn't show the password criteria, and the API's `ResetPasswordRequest` has no `[StrongPassword]`. A weak password is either accepted (weaker than at signup) or rejected by Supabase with a 500, which the form reports as "The link may have expired".

**Inconsistencies that cause wrong output**

5. **`/user/<my id>` is not seen as my own profile** (`isOwnProfile` only compares to `'me'`). My own scores show up as "my score", and my ratings are fetched twice. `AuthStore.loggedInUserId` should be used. The same applies to `RestaurantRatingsTabs`, which guesses my id from `myRatings[0]`.
6. **Two different tierlist counts.** The tierlist card counts `restaurants.length`; the detail page counts only the restaurants the owner has rated.
7. **Explore can load forever.** Its loader waits for geolocation, and the `getCurrentPosition` timeout only starts once permission is granted. An unanswered permission prompt keeps the 🍽️ loader on screen.
8. **The new review sheet flashes "No restaurants found"** during the 500 ms debounce, before the first search of a query runs.
9. **Login reports every error as "Invalid email or password."**, including when the server is down or there's no network.
10. **Unreachable error messages.** "Log in to rate this restaurant." / "Log in to create a tierlist." (on 401) can never show: the 401 interceptor already logs out and redirects to `/login`.

**Design**

11. **A mutation runs inside a resource.** `/restaurant/place/:placeId` POSTs `from-place` from an `rxResource`, then redirects to `/restaurant/:id`. That loads the restaurant again, and the first page has already fired 3 rating requests that are thrown away. A resource can re-run its stream, so a POST doesn't belong in one.
12. **Duplicate requests.** `Home` calls `/users/me/ratings` twice (recent reviews and favorites). `TierlistDetail` fetches the owner's and my ratings separately even when I'm the owner.
13. **Explore downloads every restaurant** (`GET /api/restaurants`) to show 5. This won't scale; it should be an API query (unvisited, nearest first).
14. **Layering.** `shared/ui/new-review-chip` and `layout/bottom-tab-bar` import `NewReviewStore` from `features/review`. App-wide state belongs in `core/` (or `layout/`).
15. **Navigation through buttons.** `UserBar`, the home settings button, Explore cards, search result items and the tierlists "New" chip call `router.navigateByUrl` from a `<button>`, where elsewhere the app uses `routerLink`. These have no `href`, can't open in a new tab, and are announced as buttons.

**Minor**

16. `RankedRestaurantItem` nests a `role="button"` span inside its `<a>`: an interactive element inside another, which only reacts to Enter, not Space.
17. `RecentReviewCard` computes the average itself instead of using `ratingAverage()`.
18. `SignupDraftStore` keeps the typed password in memory after an abandoned signup, until the page is reloaded.
19. The test helpers `core/auth/auth-testing.ts` and `testing/dom-testing.ts` are not `.spec.ts` files, so the app build type-checks them (they are tree-shaken out of the bundle).
