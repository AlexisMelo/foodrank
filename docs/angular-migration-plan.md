# FoodRank — Vue → Angular migration plan

Plan for migrating `apps/frontend-vue` (Vue 3) to a new Angular 22 app in `apps/frontend`, one step per Claude Code session.

**How to use it:** open a fresh session (`/clear`), switch to plan mode and say:

> Read `docs/angular-migration-plan.md` and do step **X.Y**.

Do the steps in order: each one relies on the previous ones. Tick the box once the step is committed.

## Progress

- [x] 0.1 Create the Angular app
- [x] 0.2 Lint and format
- [x] 0.3 Configuration, global styles, root scripts, `apps/frontend/CLAUDE.md`
- [x] 1.1 Models and business utils
- [x] 1.2 HTTP layer and API services
- [x] 1.3 Auth core (session, guards, 401 interceptor)
- [x] 1.4 Routes and app shell
- [x] 2.1 Login, sign up, forgot and reset password
- [x] 2.2 Home
- [x] 2.3 Restaurant page
- [x] 2.4 New review: search sheet and user location
- [x] 2.5 New review: rating form
- [x] 2.6 Explore and search results
- [x] 2.7 Profile
- [x] 2.8 Tierlists: list and detail
- [x] 2.9 Tierlists: creation
- [x] 2.10 Settings and account deletion
- [x] 3.1 Parity check
- [x] 4.1 Decide for leftovers
- [x] 4.1b Apply leftover decisions
- [x] 4.2 New tests
- [x] 4.3 Chase mock data
- [x] 4.4 Project review
- [ ] 4.4.1 Loading, error and not-found states
- [ ] 4.4.2 Auth error messages
- [ ] 4.4.3 Password rules on the password reset (API + front)
- [ ] 4.4.4 Logged-in user and duplicate requests
- [ ] 4.4.5 Opening a restaurant from a search result
- [ ] 4.4.6 Add restaurants to a tierlist: decisions and API
- [ ] 4.4.7 Add restaurants to a tierlist: frontend
- [ ] 4.4.8 Explore suggestions from the API (API + front)
- [ ] 4.4.9 Navigation links and accessibility
- [ ] 4.4.10 Code hygiene
- [ ] 5.1 Remove the Vue app

---

## Rules for every step

1. **Load the `angular-developer` skill** and read the references listed in the step. Use the Angular CLI MCP server (`get_best_practices`, `search_documentation`) when in doubt. Angular's official guidance wins over habits from Vue.
2. **Read the Vue source first**: every file listed in the step and its specs. `apps/frontend-vue` is **read-only**: never modify it.
3. **Port the behavior 1:1.** No new features, no redesign, no copy changes. Keep the CSS: copy each `<style scoped>` block into the component's `.scss` file. If a Vue behavior looks like a bug, keep it and report it in the summary.
4. **Generate with the CLI** (`ng generate component|service|guard|interceptor ...`), then fill in the code.
5. **Port the tests together with the code** (see [Translating the tests](#translating-the-tests)). Keep each `describe`/`it` name, so a test can be matched to its Vue original. Never drop a test silently: if one no longer applies, say why in the summary.
6. **Before proposing the result**, run from the repo root: `npm run test:front`, then `npm run lint --prefix apps/frontend` and `npm run build --prefix apps/frontend`. All three must pass.
7. **Final summary**: Vue tests → Angular tests mapping with counts, test run result, anything not ported 1:1, and the manual checks the user should do in the browser (`npm start`).
8. Tick the step in [Progress](#progress) and suggest the commit message given in the step (repo style: `type (scope): message`).
9. **No new dependency** beyond those named in this plan without asking first.

---

## Architecture decisions

These follow the Angular team's recommendations (`angular-developer` skill). Step 0.3 copies the durable ones into `apps/frontend/CLAUDE.md`.

| Topic                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version and defaults        | Angular 22, standalone components, zoneless, Vitest (CLI defaults). No SSR.                                                                                                                                                                                                                                                                                                                                                                                    |
| Components                  | `input()`, `output()`, `model()` (replaces `defineModel`), `computed()`, `ChangeDetectionStrategy.OnPush`, native control flow (`@if`, `@for`, `@switch`), `host: {}` instead of `@HostBinding`/`@HostListener`, `[class.x]`/`[style.x]` instead of `ngClass`/`ngStyle`. External `.html` + `.scss` files, except for very small components.                                                                                                                   |
| Naming                      | Angular v20+ style, as generated by the CLI: `login-form.ts` / `class LoginForm`, no `.component` suffix. Models keep the `.model.ts` suffix.                                                                                                                                                                                                                                                                                                                  |
| Services and state          | `@Service()` + `inject()`. Shared state lives in a private `signal()` exposed through `.asReadonly()`.                                                                                                                                                                                                                                                                                                                                                         |
| Vue composables             | **Module-level shared state** (`useAuth`, `useNewReview`, `useSignupDraft`) → root `@Service()` store. **Page data loading** (`useRestaurantRatings`, `useProfileRanking`, `useUserProfile`, `useMyRecentRatings`) → `rxResource` in the page, or a feature service provided by the page (`@Service({ autoProvided: false })` + `providers`) when the logic is shared or heavy. `watch` → `computed`/resource params. Use `effect` only for real side effects. |
| HTTP                        | `HttpClient` replaces axios. API services return `Observable`s. Reads use `rxResource` (`params` from signals or route inputs). Mutations in async handlers use `await firstValueFrom(...)`, so the Vue `try/catch` flows port as-is. Errors are `HttpErrorResponse`.                                                                                                                                                                                          |
| API URL and cookies         | Relative URLs (`/api/...`). In dev, `proxy.conf.json` forwards `/api` to `https://localhost:7207`. A functional interceptor adds `environment.apiUrl` (empty in dev) and `withCredentials: true` to `/api` requests, matching what axios did.                                                                                                                                                                                                                  |
| Routing                     | Functional guards (`CanActivateFn`), lazy `loadComponent` for every page except home and auth, `withComponentInputBinding()` so `:id` and `?step` arrive as `input()`s. Page access is declared in route `data: { access: 'guest' \| 'public' }` and checked by the existing `sessionRedirect`.                                                                                                                                                                |
| Auth bootstrap              | `provideAppInitializer` waits for the `/api/auth/me` check before the first navigation. This replaces the `isReady` gate in `App.vue`.                                                                                                                                                                                                                                                                                                                         |
| Layout                      | A `Shell` layout component (`router-outlet` + bottom tab bar + new review sheet) is the parent of all private routes. Guest and public routes sit outside it. This replaces the `v-if` on `route.meta.access` in `App.vue`.                                                                                                                                                                                                                                    |
| Forms                       | **Signal Forms** (`@angular/forms/signals`, stable in v22). Validation reuses the existing pure functions (`utils/signup.ts`, …) through `validate()`. Use `debounce()` instead of hand-made timers.                                                                                                                                                                                                                                                           |
| Modals (`<Teleport>`)       | Native `<dialog>` + `showModal()`. It renders in the browser top layer, which is what `Teleport to="body"` was for, and comes with Esc and focus handling. No CDK.                                                                                                                                                                                                                                                                                             |
| Animations (`<Transition>`) | Native CSS with `animate.enter` / `animate.leave`. Never the legacy `@angular/animations` package.                                                                                                                                                                                                                                                                                                                                                             |
| Styles                      | Global reset and `body` styles from `App.vue` → `src/styles.scss`. `responsive.scss` and `_auth-forms.scss` → `src/styles/`, imported with `@use 'responsive';` (`stylePreprocessorOptions.includePaths`). Default emulated encapsulation. Avoid `::ng-deep`: style children through their own styles or inputs.                                                                                                                                               |
| Import alias                | `@/*` → `src/app/*`.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Accessibility               | Keep or improve semantics (buttons, labels, `aria-*`). Target the WCAG AA level that the Angular best practices require.                                                                                                                                                                                                                                                                                                                                       |

### Target structure

```
apps/frontend/src/
├── environments/                 environment.ts, environment.development.ts
├── styles.scss                   global styles (from App.vue)
├── styles/                       responsive.scss, _auth-forms.scss
└── app/
    ├── app.ts, app.config.ts, app.routes.ts
    ├── core/
    │   ├── models/               rating.model.ts, restaurant.model.ts, tierlist.model.ts, user.model.ts
    │   ├── utils/                auth.ts, ranking.ts, rating.ts, signup.ts, profile.ts, tierlist.ts (pure functions)
    │   ├── api/                  rating-api.ts, restaurant-api.ts, tierlist-api.ts, user-api.ts, api-interceptor.ts
    │   ├── auth/                 auth-store.ts, access-guard.ts, unauthorized-interceptor.ts
    │   └── location/             user-location.ts
    ├── layout/                   shell, bottom-tab-bar, page-top-bar
    ├── shared/ui/                components used by several features (table below)
    └── features/
        ├── auth/                 login, sign up steps, forgot/reset password, signup-draft store, signup-step guard
        ├── home/  restaurant/  review/  explore/  search/  profile/  tierlists/  settings/
```

### Where each Vue component goes

| Vue component                                                                                                                           | Angular location                      | Used by          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| `RatingScores`, `RankedRestaurantItem`, `UserAvatar`, `UserBar`, `TierlistChip`, `NewChip`, `NewReviewChip`, `ToggleSwitch`             | `shared/ui/`                          | several features |
| `BottomTabBar`, `PageTopBar`, `NewReviewModal`, `SearchAreaHint`                                                                        | `layout/` (sheet: `features/review/`) | app-wide         |
| `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `signup/*`                                                        | `features/auth/`                      | auth pages       |
| `RecentReviewCard`                                                                                                                      | `features/home/`                      | home             |
| `CuisineChip`, `RestaurantAddress`, `RestaurantRatingsTabs`, `GlobalScoreBadge`, `CriteriaAverages`, `MyRatingCard`, `RecentRatingCard` | `features/restaurant/`                | restaurant page  |
| `ProfileHeader`, `PinnedTierlists`                                                                                                      | `features/profile/`                   | profile          |
| `TierlistCard`, `TierlistPinButton`, `EmojiCoverPicker`                                                                                 | `features/tierlists/`                 | tierlists        |
| `DeleteAccountModal`                                                                                                                    | `features/settings/`                  | settings         |

Each shared component is created in the first step that needs it, then reused.

### Translating the tests

| Vue test code                                                | Angular equivalent                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `mount(Component, { props })`                                | `TestBed.createComponent(...)`, then `fixture.componentRef.setInput(...)`                                           |
| `await flushPromises()` / `nextTick()`                       | `await fixture.whenStable()` ("act, wait, assert"). No `fixture.detectChanges()` (zoneless).                        |
| `vi.mock('axios')` + `vi.stubEnv`                            | `provideHttpClient()` + `provideHttpClientTesting()`, then `HttpTestingController` (`expectOne`, `flush`, `verify`) |
| `vi.mock('@/services/...')` / `vi.mock('@/composables/...')` | Hand-written fake object in TestBed `providers: [{ provide: RatingApi, useValue: fake }]`. `vi.fn()` is allowed.    |
| Router mocks, `router.push` in tests                         | `RouterTestingHarness` with the real routes (the skill says not to mock the Router)                                 |
| `navigator.geolocation` / `navigator.permissions`            | Wrap them in `core/location/` and fake that service                                                                 |
| `wrapper.find(...).trigger('click')`                         | `fixture.nativeElement.querySelector(...).click()`, then `await fixture.whenStable()`                               |

Test files sit next to their source (`login-form.spec.ts` next to `login-form.ts`), as the CLI generates them. Same rule as the root `CLAUDE.md`: no new test library. TestBed, `HttpTestingController` and `RouterTestingHarness` are built into Angular.

---

## Phase 0 — Project setup

### 0.1 Create the Angular app

- Use the **`angular-new-app` skill**. Check `ng version`: it must be 22.x on Node ≥ 24.15.
- From `apps/`:

  ```
  ng new foodrank --directory=frontend --style=scss --routing --ssr=false --skip-git --ai-config=none --interactive=false
  ```

  - `--skip-git`: we are already inside the FoodRank repo.
  - `--ai-config=none`: the `angular-developer` skill and this plan replace a generated rules file that would never be updated.

- Clean the scaffold:
  - `app.html` contains only `<router-outlet />`; remove the `title` signal.
  - Delete the welcome test in `app.spec.ts` (it only checks the placeholder title).
  - `index.html`: `<title>FoodRank</title>`, the `lang` matching the UI language, and the favicon copied from `apps/frontend-vue/public/`.
- `package.json`: `"test": "ng test --watch=false"`, so that `npm run test:front` runs the suite once.
- Done when `ng build` and `npm test --prefix apps/frontend` pass.
- Commit: `chore (frontend): scaffold Angular 22 app`

### 0.2 Lint and format

- Run `ng add angular-eslint` in `apps/frontend`.
- Lint, format and editor settings follow the Angular standards, not the Vue app's rules:
  - ESLint: the configuration generated by `ng add angular-eslint`, unchanged.
  - Prettier: keep the `.prettierrc` generated by `ng new` (`printWidth: 100`, `singleQuote: true`, semicolons, `angular` parser for `*.html`). Keep the `prettier` devDependency and add the `format` (`prettier --write src/`) and `lint` scripts.
  - `.editorconfig`: keep the one generated by `ng new`.
- Done when `npm run lint` passes and `npm run format` produces no diff after a second run.
- Commit: `chore (frontend): add angular-eslint and prettier`

### 0.3 Configuration, global styles, root scripts, `apps/frontend/CLAUDE.md`

- **Alias**: `tsconfig.json` → `"paths": { "@/*": ["./src/app/*"] }`.
- **Environments**: run `ng generate environments` and set `apiUrl: ''` in both files.
- **Proxy**: `proxy.conf.json` (`/api` → `https://localhost:7207`, `secure: false`, `changeOrigin: true`), declared in `angular.json` under `serve.options.proxyConfig`. It is the same proxy as in `apps/frontend-vue/vite.config.ts`. The API cookie (`SameSite=Lax`, no `Domain`) works through it, and CORS needs no change.
- **Styles**:
  - Copy the `<style>` of `App.vue` into `src/styles.scss`.
  - Copy `responsive.scss` and `_auth-forms.scss` into `src/styles/`.
  - Add `stylePreprocessorOptions.includePaths: ["src/styles"]` to the build and test targets.
- **Root `package.json`**:
  - `start` → `npm start --prefix apps/frontend`
  - `test:front` → `npm test --prefix apps/frontend`
  - New `test:front-vue` → `npm test --prefix apps/frontend-vue` (temporary, removed in 3.2)
- **`apps/frontend/CLAUDE.md`**: short and FoodRank-specific only.
  - The [Architecture decisions](#architecture-decisions) table and the [test translation rules](#translating-the-tests).
  - "Generic Angular guidance: `angular-developer` skill."
  - "During the migration, `apps/frontend-vue` is the read-only reference and `docs/angular-migration-plan.md` the plan."
- Done when:
  - `npm start` serves the API and Angular on `http://localhost:4200`;
  - in the browser console, `await fetch('/api/auth/me')` returns **401** (not 404 or a CORS error);
  - `npm run test:front` and `npm run test:front-vue` both pass.
- Commit: `chore (frontend): configure alias, proxy, styles and scripts`

---

## Phase 1 — Core (no pages yet)

### 1.1 Models and business utils

- **Source:** `apps/frontend-vue/src/types/*` (except `database.types.ts`) and `src/utils/*` with `utils/__tests__/` (4 specs, 25 tests).
- **Target:** `core/models/*.model.ts` and `core/utils/*.ts`. Only file names and import paths change; the code is framework-free.
- **Tests:** the 4 specs move next to their file and stay unchanged apart from imports. All 25 tests pass.
- **Not ported:** `database.types.ts` (only cited in comments, generated for Supabase) and the `gen:types` script.
- Commit: `refactor (frontend): port models and business utils`

### 1.2 HTTP layer and API services

- **References:** `http-client.md`, `creating-services.md`, `di-fundamentals.md`.
- **Source:** `src/services/*.ts` + `services/__tests__/` (4 specs, 30 tests).
- **Target:**
  - `core/api/api-interceptor.ts`: prefixes `environment.apiUrl` and sets `withCredentials: true` on `/api` requests; registered with `provideHttpClient(withInterceptors([...]))` in `app.config.ts`.
  - `rating-api.ts`, `restaurant-api.ts`, `tierlist-api.ts`, `user-api.ts`: `@Service()` classes using `HttpClient`, returning `Observable`s, with the same URLs, encoding (`encodeURIComponent`), payloads and error mapping (e.g. a status turned into `null` or a domain error).
- Keep the `community-ratings.json` mock used by `ratingService.ts` as it is: copy it to `core/api/data/`. It is listed in [Leftovers](#leftovers-to-decide-with-the-user).
- **Tests:** translate the 30 tests to `HttpTestingController`. Assert method, URL, body and `withCredentials`, then the result or the error for each status. Add one test for the interceptor.
- Commit: `feat (frontend): HttpClient API services`

### 1.3 Auth core

- **References:** `route-guards.md`, `http-client.md` (interceptors), `environment-configuration.md` (`provideAppInitializer`), `router-testing.md`.
- **Source:** `composables/useAuth.ts`, `utils/auth.ts` (already ported), `composables/__tests__/useAuth.spec.ts` (18 tests). Also read commit `d50e6dd`: the reset password page must stay open when the first session check returns 401.
- **Target:**
  - `core/auth/auth-store.ts`: `isLoggedIn` and `currentUser` signals (read-only), `checkSession`, `login`, `signup`, `logout`, `deleteAccount`. Same navigation after each action (`router.navigateByUrl`, with `replaceUrl` where Vue used `replace`).
  - `provideAppInitializer(() => inject(AuthStore).checkSession())` in `app.config.ts`.
  - `core/auth/access-guard.ts`: a `CanActivateFn` reading `route.data.access` and returning `sessionRedirect(...)` as a `UrlTree`.
  - `core/auth/unauthorized-interceptor.ts`: on 401, set logged out and leave the page if it is no longer allowed. The initializer has already run when this fires, so the Vue "ignore before ready" special case becomes the initializer ordering. Keep a test proving the reset password page stays reachable.
- **Tests:** translate the 18 `useAuth` tests (store + guard + interceptor). Guard and redirect tests use `RouterTestingHarness` with stub pages.
- Commit: `feat (frontend): auth store, access guard and 401 interceptor`

### 1.4 Routes and app shell

- **References:** `define-routes.md`, `loading-strategies.md`, `show-routes-with-outlets.md`, `navigate-to-routes.md`, `angular-animations.md`.
- **Source:** `router/index.ts`, `App.vue`, `BottomTabBar.vue`, `PageTopBar.vue`, `composables/useNewReview.ts`.
- **Target:**
  - `app.routes.ts` with **every** Vue route and the same paths. Guest and public pages (`/login`, `/signup`, `/auth/reset-password`) are top-level routes. All private pages are children of the `Shell` route with `canActivate: [accessGuard]`.
  - Use `provideRouter(routes, withComponentInputBinding())`.
  - Each page not migrated yet is a minimal placeholder component (`<p>TODO: page name</p>`), replaced by its feature step.
  - `layout/shell`: `<router-outlet />` + `BottomTabBar`; the new review sheet slot is filled in 2.4.
  - `features/review/new-review-store.ts`: `isOpen`, `open()`, `close()`.
  - `layout/bottom-tab-bar`, `layout/page-top-bar`: ported with their styles, `routerLink` / `routerLinkActive`.
- **Tests:** none exist in Vue for these. Add one `RouterTestingHarness` test: a logged-out user opening `/profile` lands on `/login`, and a logged-in user opening `/login` lands on `/`. (The guard logic itself is covered in 1.3.)
- **Manual check:** each tab of the bottom bar opens its placeholder, and logging out (from the console via the store) goes to `/login`.
- Commit: `feat (frontend): routes, shell and bottom tab bar`

---

## Phase 2 — Features (one per session)

In every step: replace the placeholder route, put shared components in `shared/ui/` the first time they are needed, and port each component's styles.

### 2.1 Login, sign up, forgot and reset password

- **References:** `signal-forms.md`, `route-guards.md`, `inputs.md`, `outputs.md`.
- **Source:**
  - Views: `views/AuthView.vue`, `views/ResetPasswordView.vue`.
  - Components: `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `signup/SignupPasswordStep`, `signup/SignupProfileStep`, `signup/SignupStepLayout`, `signup/PasswordCriteria`.
  - State and guard: `composables/useSignupDraft.ts`, `router/signupStepGuard.ts`.
- **Target:**
  - `features/auth/`.
  - `signup-draft-store.ts`: root `@Service()`, kept in memory only, password never stored.
  - `signup-step-guard.ts`: a `CanActivateFn` on `/signup` that returns the `UrlTree` from `signupStepRoute(...)`.
  - All forms use Signal Forms, with validators that call `utils/signup.ts`.
- **Tests:** `LoginForm.spec` (4), `SignupProfileStep.spec` (5), `SignupFlow.spec` (7) → 16 tests.
- **Not ported:** `AuthCallbackView.vue`, which is not referenced by any route (see Leftovers).
- **Manual check:**
  - login OK and with a wrong password;
  - sign up through all three steps, including going back and opening `?step=3` directly;
  - forgot password;
  - reset password link opened while logged out.
- Commit: `feat (frontend): auth pages`

### 2.2 Home

- **Source:**
  - View: `views/HomeView.vue`.
  - Components: `RecentReviewCard`, `NewReviewChip`, `NewChip`, `RankedRestaurantItem`, `RatingScores`, `TierlistChip`, `UserBar`, `UserAvatar`.
  - Composables: `useUserProfile.ts`, `useMyRecentRatings.ts`.
- **Target:** `features/home/`; the shared components go to `shared/ui/`. Page data is loaded with `rxResource`.
- **Tests:** `HomeView.spec` (8), `RatingScores.spec` (2), `useUserProfile.spec` (4), `useMyRecentRatings.spec` (3) → 17 tests.
- **Manual check:** loading state, empty states, and links to restaurants and tierlists; the "new review" chip opens the store (the sheet arrives in 2.4).
- Commit: `feat (frontend): home page`

### 2.3 Restaurant page

- **Source:**
  - View: `views/RestaurantView.vue` (routes `/restaurant/:id` and `/restaurant/place/:placeId`, which gets or creates the restaurant, then replaces the URL).
  - Components: `CuisineChip`, `RestaurantAddress`, `RestaurantRatingsTabs`, `GlobalScoreBadge`, `CriteriaAverages`, `MyRatingCard`, `RecentRatingCard`.
  - Composable: `useRestaurantRatings.ts`.
- **Target:** `features/restaurant/`. `id` and `placeId` arrive as route `input()`s, and the resource params react to them (this replaces `watch(route.params, ..., { immediate: true })`).
- **Tests:** `RestaurantRatingFlow.spec` (3), `RestaurantRatingsTabs.spec` (6), `useRestaurantRatings.spec` (6) → 15 tests.
- **Manual check:**
  - open a restaurant from home;
  - open one from a place id: the URL becomes `/restaurant/:id`;
  - switch tabs; check the averages and the favorite bonus.
- Commit: `feat (frontend): restaurant page`

### 2.4 New review: search sheet and user location

- **References:** `angular-animations.md`, `signal-forms.md` (`debounce`), `effects.md`.
- **Source:**
  - `components/NewReviewModal.vue` (bottom sheet with `<Transition name="sheet">`, debounced search with `setTimeout`, behavior on open via `watch(isOpen)`).
  - `components/SearchAreaHint.vue`.
  - `composables/useUserLocation.ts` (`navigator.permissions`, `navigator.geolocation`).
- **Target:**
  - `core/location/user-location.ts`: a service wrapping the browser APIs, so tests can fake it.
  - `features/review/new-review-sheet`, a native `<dialog>` with `animate.enter` / `animate.leave`, mounted in `Shell`.
  - `search-area-hint`.
  - Debounce through the Signal Forms `debounce()` rule or an `rxResource` on the query; no manual timer.
- **Tests:** `useUserLocation.spec` (6) → 6 tests. Add tests for the sheet's search behavior: debounce, and picking a result navigates.
- **Manual check:** open the sheet from the tab bar and from home, type, choose a place, Esc and backdrop close; location allowed and denied.
- Commit: `feat (frontend): new review search sheet`

### 2.5 New review: rating form

- **Source:** `views/NewReviewView.vue`, the largest file (666 lines). Read it entirely before planning.
- **Target:** `features/review/new-review`. Split it into sub-components only where the Vue template has clear sections; the behavior stays the same. The form is built with Signal Forms.
- **Tests:** `NewReviewView.spec` (5) → 5 tests. Add tests for any validation or score logic extracted from the component.
  - Also finish `features/restaurant/restaurant-rating-flow.spec.ts` (ported in 2.3 before the form existed): replace its `submitRating` helper, which saves through the fake API, with the real form (sliders, `.crush-toggle`, `.submit-btn`), as in the Vue `RestaurantRatingFlow.spec`.
- **Manual check:** rate all 3 criteria, with and without the favorite bonus; submit; check the error display and the redirection afterwards.
- Commit: `feat (frontend): new review form`

### 2.6 Explore and search results

- **Source:** `views/ExploreView.vue` (it calls `navigator.geolocation` directly), `views/SearchResultsView.vue` (`watch(query, loadSuggestions, { immediate: true })`).
- **Target:** `features/explore/`, `features/search/`. Both use `core/location/user-location.ts` instead of `navigator`, and the query arrives as a route input that drives an `rxResource`.
- **Tests:** none exist in Vue. Add tests only for logic that can break: the location fallback when permission is denied, and the suggestions reloading when the query changes.
- **Manual check:** explore with location allowed and denied; search from the home search bar and change the query.
- Commit: `feat (frontend): explore and search pages`

### 2.7 Profile

- **Source:**
  - View: `views/ProfileView.vue` (routes `/profile` and `/user/:id`; uses `:deep()` styles and `watch(notFound)`).
  - Components: `ProfileHeader`, `PinnedTierlists`.
  - Composable: `useProfileRanking.ts`.
- **Target:** `features/profile/`. Replace the `:deep()` rules with styles in the child components or inputs, not `::ng-deep`.
- **Tests:** `ProfileView.spec` (5), `useProfileRanking.spec` (3) → 8 tests.
- **Manual check:** my profile, another user's profile, an unknown user id, and the pinned tierlists.
- Commit: `feat (frontend): profile page`

### 2.8 Tierlists: list and detail

- **Source:**
  - Views: `views/TierlistsView.vue`, `views/TierlistDetailView.vue`.
  - Components: `TierlistCard`, `TierlistPinButton`.
- **Target:** `features/tierlists/`.
- **Tests:** `TierlistsView.spec` (7), `TierlistDetailView.spec` (6) → 13 tests.
- **Manual check:** list, open a tierlist, pin and unpin it, the owner's view versus another user's view.
- Commit: `feat (frontend): tierlists list and detail`

### 2.9 Tierlists: creation

- **Source:** `views/TierlistCreateView.vue`, `EmojiCoverPicker`, `ToggleSwitch` (goes to `shared/ui/`; it uses `defineModel`, which becomes `model()`), `utils/tierlist.ts` (already ported).
- **Target:** `features/tierlists/tierlist-create`, with Signal Forms.
- **Tests:** `TierlistCreateView.spec` (9) → 9 tests.
  - Also finish `features/tierlists/tierlists/tierlists.spec.ts` (ported in 2.8 before the form existed): in "lists a tierlist right after its creation", replace the `createOnCreationPage` helper (and its `TODO(2.9)`), which saves through the fake API, with the real form (`#tierlist-name`, `.create-btn`), as in the Vue `TierlistsView.spec`.
- **Manual check:** create a tierlist with an emoji cover, toggle the options, try the validation errors.
- Commit: `feat (frontend): tierlist creation`

### 2.10 Settings and account deletion

- **Source:** `views/SettingsView.vue`, `components/DeleteAccountModal.vue` (`<Teleport to="body">` + `<Transition name="fade" appear>`).
- **Target:** `features/settings/`. The modal becomes a native `<dialog>` with `showModal()` and `animate.enter`. The password field uses Signal Forms.
- **Tests:** `SettingsView.spec` (4), `DeleteAccountModal.spec` (5) → 9 tests.
- **Manual check:** logout; delete with a wrong password (403, still logged in); delete with the right password (back to `/login`).
- Commit: `feat (frontend): settings and account deletion`

---

## Phase 3 — Finish

### 3.1 Parity check

- **No placeholder left:** `grep -r "TODO" apps/frontend/src` returns nothing.
- **Test count:** list the Vue tests per area next to their Angular equivalents. The Vue app has 28 specs and about 171 `it(...)` calls; every gap must be explained.
- **Side by side:** run `npm run dev --prefix apps/frontend-vue` (`:5173`) and `npm start` (`:4200`), go through every route in the router, and compare the screens at phone width.
- **Accessibility:** run the browser's Lighthouse/axe check on the main pages and report the issues; fix them in a separate step if needed.
- Commit (fixes only): `fix (frontend): parity fixes after migration`

### 4.1 Decide for leftovers

- Ask the user what to do with each "leftover" point at the bottom of the document

### 4.1b Apply leftover decisions

Apply the decisions recorded in [Leftovers to decide with the user](#leftovers-to-decide-with-the-user). Rules 1, 4, 5 (new tests for the new behavior), 6, 7 and 8 still apply; rules 2 and 3 (1:1 port) do not: the behavior changes on purpose here.

- **Community mock → real ratings.** Delete `core/api/data/community-ratings.json`, `fetchAllCommunityVisits`, `fetchCommunityVisitsByUserId`, `CommunityVisit`/`Visit`, `CURRENT_USER_ID`/`AuthStore.currentUserId`, and the mock `User` type with `AuthStore.currentUser` (never set). Home (top 3 favorites), Explore (restaurants left out as visited) and New review (past reviews under the sliders) use the logged-in user's ratings from `GET /api/users/me/ratings` (`RatingApi.fetchUserRatings()`). Each `UserRating` already carries its restaurant, so the `fetchRestaurants()` join is only kept where every restaurant is needed (Explore). Map the API's `setting` to the `decor` the UI uses. Update the specs that fake `currentUserId` or the community visits.
- **Unported Vue files.** Nothing to port: `AuthCallbackView.vue`, `database.types.ts`, `gen:types` and `supabase/` go with the Vue app in 5.1. Remove the "see database.types.ts" references from the Angular model comments (`rating.model.ts`, `tierlist.model.ts`).
- **`score` and `tags`.** Remove both fields from the `Restaurant` model, and remove the tags section (template, `tags` computed, styles) from the restaurant page. The global score keeps coming from the ratings summary.
- **Unknown coordinates.** Type `Restaurant.lat`/`lng` as `number | null`, as the API sends them. In Explore, a restaurant without coordinates gets `distance: null`: it sorts after every measured restaurant and its card shows the cuisine instead of a distance, the same rule as the API's `PlaceRanking` ("places without coordinates come last"). Add a test.
- **Tierlist load error.** When the tierlist page fails to load with an error other than "not found", replace the ⏳ loader with a `role="alert"` message, `Couldn't load the tierlist, try again.`, styled like the pin error. Add a test.
- Run `npm run test:front`, lint and build (rule 6).
- Commit: `fix (frontend): apply leftover decisions`

### 4.2 New tests

- Check all code and look for untested features
- Add new tests to cover these testcases

### 4.3 Chase mock data

The community mock and `CURRENT_USER_ID` are handled in 4.1b; check that nothing else of that kind is left.

- Look for mock data (for example "community-ratings")
- Delete all hard-coded data and ask the user what to do if it breaks anything
- Look for hard coded values (for example `CURRENT_USER_ID = 'alex'`, hardcoded in `composables/useAuth.ts`)
- Replace a maximum of hard coded values by data taken from config files, ask user what to do if information is not available

### 4.4 Project review

- Place yourself as a professional angular developer and software architect
- Do an inspection of the whole project and look for anything that could result in bugs :
  - Design flaws
  - Inconsistensies
  - Unused components
  - ...

### 4.4.x Fix the review findings

The findings are listed in [Review findings](#review-findings-step-44); each step below names the ones it fixes. As in 4.1b, rules 1, 4, 5, 6, 7 and 8 apply, but rules 2 and 3 (1:1 port) do not: these steps change behavior on purpose. Steps that touch `apps/api` also follow the root `CLAUDE.md` for the API (check the prerequisites, load `dotnet-best-practices`) and run `npm test` instead of `npm run test:front`. When a step lists **decisions**, ask the user in plan mode before writing code, then record the answers under the step.

#### 4.4.1 Loading, error and not-found states (findings 2, 3, 7, 8)

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
- Tests: one per changed behavior (error message shown, unknown URL redirected, no "No restaurants found" during the debounce, Explore list shown without a position).
- Commit: `fix (frontend): loading, error and not-found states`

#### 4.4.2 Auth error messages (findings 9, 10, 18)

Frontend only.

- **Login**: say `Invalid email or password.` only for a 401 (or 400). For any other error, say `Something went wrong. Please try again.`, as the forgot password form does.
- **Unreachable 401 messages**: remove the 401 branches of `saveErrorMessage` in `new-review.ts` and `tierlist-create.ts` (the 401 interceptor already logs the user out), and the tests that cover them. Say so in the summary.
- **Signup draft**: don't keep the typed password in memory once the user leaves the sign up.
- **Decision**: when the user leaves the sign up for the login tab, clear only the password, or the whole draft? Keeping the email matches what the user expects when switching back and forth between the tabs.
- Tests: login with a 500 and with no network; draft password cleared.
- Commit: `fix (frontend): auth error messages`

#### 4.4.3 Password rules on the password reset (finding 4)

API + frontend. A reset password must follow the same rules as a signup password.

- **API**: add `[StrongPassword]` to `ResetPasswordRequest.Password`, so a weak password gets a 400. Turn a Supabase failure in `ResetPasswordAsync` into a proper status instead of a 500. Add tests in `AuthControllerTests`.
- **Frontend**: in `ResetPasswordForm`, reuse `PasswordCriteria` and the `isValidPassword` validation of the signup password step, and keep the button disabled until the password is valid. Map the statuses to messages: 400 → the password rules, 401 → `The link may have expired`, anything else → a generic error.
- Run `npm test` (API + front).
- Commit: `fix (auth): apply the password rules to the password reset`

#### 4.4.4 Logged-in user and duplicate requests (findings 5, 12)

Frontend only. Recognize the logged-in user through `AuthStore.loggedInUserId`, and load each piece of data once per page.

- **`/user/<my id>`**: treat it as my own profile (no "my score", no rate buttons, no second ratings request).
- **`RestaurantRatingsTabs`**: get my id from `AuthStore.loggedInUserId` instead of `myRatings[0]`.
- **`Home`**: one `/users/me/ratings` request, shared by the recent reviews and the favorites.
- **`TierlistDetail`**: when I own the tierlist, reuse the owner's ratings as my ratings instead of requesting them twice.
- **Decision**: for `/user/<my id>`, redirect to `/profile` (one URL for my profile), or render it as my own profile in place?
- Tests: request counts (`HttpTestingController` or the call counts of the fakes), own profile reached by its id.
- Commit: `fix (frontend): recognize the logged-in user and drop duplicate requests`

#### 4.4.5 Opening a restaurant from a search result (finding 11)

Frontend only. Creating the restaurant (`POST /api/restaurants/from-place`) must not run inside an `rxResource`, and the restaurant and its ratings must be loaded only once.

- Move the creation out of `RestaurantDetail`, so that it only handles `restaurant/:id`.
- Keep the current behavior on failure: `Couldn't load this restaurant` with a "Go back" button.
- **Decision**: where should the creation run?
  - a functional guard on `restaurant/place/:placeId` that POSTs and returns a `UrlTree` to `/restaurant/:id` (no extra page instance, but the error then needs its own page or route);
  - or the search sheet and the search results create the restaurant before navigating (the `restaurant/place/:placeId` route goes away).
- Tests: with `RouterTestingHarness`, one POST, one restaurant GET and one set of rating requests; the error case.
- Commit: `refactor (frontend): create the restaurant from a place outside the page resource`

#### 4.4.6 Add restaurants to a tierlist: decisions and API (findings 1, 6)

A new feature, split in two steps (API here, frontend in 4.4.7) to keep each session focused. Start in plan mode and take the decisions with the user, then record them here for 4.4.7.

- **Decisions**:
  - Where does the user add a restaurant: from the tierlist page (a picker), from the restaurant page ("Add to a tierlist"), or both?
  - Which restaurants can be added: any restaurant, or only the ones the owner has rated?
  - Can a restaurant be removed from a tierlist?
  - Finding 6: which count does the app show, all the restaurants of the tierlist or only the rated ones? It must be the same on the card and on the detail page. If unrated restaurants are allowed, how does the detail page show them?
- **API**: endpoints to add and remove a restaurant, for example `POST /api/tierlists/{id}/restaurants` `{ restaurantId }` and `DELETE /api/tierlists/{id}/restaurants/{restaurantId}`. Owner only (403 otherwise), 404 for an unknown tierlist or restaurant, 409 when it is already in the tierlist. Update `updated_at`. Add controller tests for every status.
- Run `npm run test:api`.
- Commit: `feat (api): add and remove restaurants of a tierlist`

#### 4.4.7 Add restaurants to a tierlist: frontend (findings 1, 6)

Frontend part of 4.4.6, following the decisions recorded there.

- `TierlistApi` methods for the new endpoints, and the UI where the decisions put it.
- The same restaurant count on `TierlistCard` and `TierlistDetail` (finding 6).
- The detail page shows an empty state when the tierlist has no restaurant.
- Tests: add, remove, owner only, errors, counts.
- Run `npm test` (the API contract used by the frontend changes).
- Commit: `feat (frontend): add and remove restaurants of a tierlist`

#### 4.4.8 Explore suggestions from the API (finding 13)

API + frontend. Explore must stop downloading every restaurant to show 5.

- **API**: an endpoint returning the suggestions of the logged-in user, for example `GET /api/restaurants/suggestions?lat&lon&limit=5`: restaurants the user hasn't rated, nearest first, restaurants without coordinates last (the `PlaceRanking` rule). Add tests.
- **Frontend**: `Explore` uses it. Remove `nearbyUnvisited` and the client-side join. Keep the 4.1b behavior (no coordinates: sorted last, cuisine shown instead of the distance) and its test.
- **Decisions**:
  - Does the API return the distance, or does the frontend keep computing it for display?
  - Without a position, which order?
- Run `npm test`.
- Commit: `feat (explore): suggest restaurants from the API`

#### 4.4.9 Navigation links and accessibility (findings 15, 16)

Frontend only. Do it after 4.4.8, which also changes the Explore cards.

- Use `<a routerLink>` instead of a `<button>` calling `router.navigateByUrl` for every navigation: `UserBar`, the home settings button, the Explore cards, the search result items and the "New" chip of the tierlists page. The look must not change. `NewChip` stays a button where it opens the new review sheet.
- `RankedRestaurantItem`: move the rate button out of the link (a real `<button>`, placed next to it) so that no interactive element is nested in another.
- Tests: the links have the right `href`. Update the existing click tests.
- Commit: `fix (frontend): use links for navigation`

#### 4.4.10 Code hygiene (findings 14, 17, 19)

Frontend only, no behavior change.

- Move `NewReviewStore` out of `features/review` (to `core/`), so that `shared/` and `layout/` no longer import from a feature.
- `RecentReviewCard` uses `ratingAverage()`.
- Keep the test helpers (`core/auth/auth-testing.ts`, `testing/dom-testing.ts`) out of the app build: exclude them in `tsconfig.app.json`, or rename them to a pattern it already excludes.
- The existing tests must pass unchanged, apart from the imports.
- Commit: `refactor (frontend): layering and test helpers`

### 5.1 Remove the Vue app

- Delete `apps/frontend-vue`.
- Remove the `test:front-vue` script.
- Update the root `CLAUDE.md` (structure) and `README.md`.
- In `apps/frontend/CLAUDE.md`, remove the migration lines.
- Remove the `vue-best-practices` skill.
- Delete this plan, or keep it in `docs/` as history.
- Check that `npm test` (API + front) passes.
- Commit: `chore (frontend): remove the Vue app`

---

## Leftovers to decide with the user

These come from the Vue app. Port them as they are and do not fix them during the migration; ask the user once the migration is done.

Decided with the user in step 4.1, applied in step 4.1b:

- `CURRENT_USER_ID = 'alex'`, hardcoded in `composables/useAuth.ts`. → **Delete**, with the mock below.
- The `data/community-ratings.json` mock, imported by `services/ratingService.ts`. Its restaurant ids (`bella-napoli`…) match no API restaurant, so the sections using it are always empty with the real API. → **Replace with `GET /api/users/me/ratings`.**
- `views/AuthCallbackView.vue`, not referenced by any route (not ported). → **Drop**: removed with the Vue app (5.1).
- `types/database.types.ts`, the `gen:types` script and the empty `supabase/` folder (not ported). → **Drop**: removed with the Vue app (5.1); remove the comments that still point to `database.types.ts`.
- `ExploreView.vue`, which duplicated the geolocation code of `useUserLocation` (unified in 2.6). → **Already resolved**, nothing to do.
- GET /api/restaurants returns the database restaurant, which has no score and no tags, so those two fields are always undefined in the app. → **Remove both fields from the frontend** and the never-shown tags section; the score already comes from the ratings summary.
- The API sends lat and lng as null when unknown, but the frontend type says number. JS turns `null` into `0`, so Explore measures the distance to (0, 0) and shows a fake one. → **Type as `number | null`**: no distance shown, sorted last, as the API's `PlaceRanking` does.
- If the tierlist page fails to load (a server error, not "not found"), it shows the ⏳ loader forever. There is no error message, as in Vue. → **Show an error message** (`role="alert"`, no retry button).

---

## Review findings (step 4.4)

Found during the project review. Each finding is fixed by one of the steps [4.4.1 to 4.4.10](#44x-fix-the-review-findings), which name the findings they cover.

**Bugs a user can hit**

1. **Tierlists stay empty.** There is no way to add a restaurant to a tierlist: no UI and no API endpoint (`TierlistsController` only has create, get and pin). The detail page ranks restaurants that can never be added.
2. **Pages left blank on a load error** (same defect as the tierlist page fixed in 4.1b):
   - `NewReview` shows nothing while loading and stays blank forever on a server error (`@if (restaurant())` only). Since it uses `forkJoin`, a failing `/users/me/ratings` call also blanks the page.
   - `Profile`: if the profile fails to load, the page is blank. If the ranking fails, it says "No restaurant rated yet". `user.loadError` and `ranking.loadError` are never shown.
   - `Home`: if the profile fails, the user bar skeleton stays forever.
3. **No wildcard route.** An unknown URL (e.g. `/foo`) fails the navigation and shows a blank page. Vue had no catch-all either.
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
