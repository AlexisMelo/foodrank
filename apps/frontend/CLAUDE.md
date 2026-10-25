# FoodRank frontend (Angular)

Generic Angular guidance comes from the `angular-developer` skill and the Angular MCP `get_best_practices` (standalone, zoneless, OnPush, signal inputs, native control flow, `host: {}`, `animate.enter`, WCAG AA…). This file only holds the FoodRank-specific decisions.

## Commands

Run from `apps/frontend`: `npm run lint`, `npm run format`, `npm run build`, `npm start` (dev server on `:4200`, `/api` proxied to `https://localhost:7207` by `proxy.conf.json`). Code style follows the Angular CLI defaults (ESLint from `angular-eslint`, Prettier with semicolons).

## Comments

- **Every property has a `/** */` doc comment**, with no exception: class fields (public or private, including injected dependencies, signals, `input()`, `output()`, `model()`, queries), interface and type properties (models, inline object types), and `environment` values. Functions, methods and exported constants have one too.
- Say what the code does not: meaning, unit or range (`0 to 100`), when it is `null`/`undefined`/empty, where the value comes from (API endpoint, route, config), and why it exists when that is not obvious.
- When the code and the data disagree (e.g. a field the API never sends), say it in the comment and report it in the summary instead of changing the type silently.
- The presence of the comments is not enforced by the linter: check it yourself before proposing a change.

## Comment and member layout

Enforced by the local ESLint rules in `eslint-rules.js` (auto-fixable with `npm run lint -- --fix`):

- **Doc comments are always written on three lines**, never `/** text */`, even when the text is short (`foodrank/multiline-doc-comment`):

  ```ts
  /**
   * True while the login request runs: the fields and the button are disabled
   */
  protected readonly loading = signal(false);
  ```

- **One empty line between every member** of a class, an interface or a multi-line object type (`foodrank/padded-members`).
- **No groups of members**: no extra empty lines or `//` section comments to group `input()`s, `output()`s, `inject()`s, signals, etc. Explain the reason in each member's doc comment instead.

## Architecture decisions

- **No SSR.**
- **Components**: external `.html` + `.scss` files, except for very small components.
- **Naming**: CLI style (`login-form.ts` / `class LoginForm`, no `.component` suffix). Models keep the `.model.ts` suffix.
- **State**: services use `@Service()` + `inject()`; shared state is a private `signal()` exposed through `.asReadonly()`. App-wide state (`AuthStore`, `NewReviewStore`, `SignupDraftStore`) lives in root stores. Page data is loaded with `rxResource` in the page, or an `injectXxx()` function (`injectUserProfile`, `injectRestaurantRatings`, …) or a feature service provided by the page (`@Service({ autoProvided: false })` + `providers`) when the logic is shared or heavy. Use `effect` only for real side effects.
- **HTTP**: API services return `Observable`s. Reads use `rxResource` (`params` from signals or route inputs). Mutations in async handlers use `await firstValueFrom(...)` inside a plain `try/catch`. Errors are `HttpErrorResponse`.
- **API URL and cookies**: relative URLs (`/api/...`). A functional interceptor adds `environment.apiUrl` (empty in dev) and `withCredentials: true` to `/api` requests.
- **Routing**: lazy `loadComponent` for every page except home and auth, `withComponentInputBinding()` so `:id` and `?step` arrive as `input()`s. Page access is declared in route `data: { access: 'guest' | 'public' }` and checked by `sessionRedirect`.
- **Auth bootstrap**: `provideAppInitializer` waits for the `/api/auth/me` check before the first navigation.
- **Layout**: a `Shell` component (`router-outlet` + bottom tab bar + new review sheet) is the parent of all private routes. Guest and public routes sit outside it.
- **Forms**: Signal Forms (`@angular/forms/signals`). Validation reuses the existing pure functions (`utils/signup.ts`, …) through `validate()`. Use `debounce()` instead of hand-made timers.
- **Modals**: native `<dialog>` + `showModal()`. No CDK. Confirmations use `shared/ui/confirm-dialog`, searchable pick lists `shared/ui/search-dialog`.
- **Menus of actions**: `shared/ui/actions` (3 dots button, given `Action`s), a native popover anchored with CSS anchor positioning. Its specs call `stubPopovers()` (jsdom has no Popover API), as dialog specs call `stubDialogs()`.
- **Sort chips**: `shared/ui/sort-chips` (`[options]` + `[(value)]`). The lists of restaurants share `RESTAURANT_SORT_OPTIONS` and `sortRestaurants` (`core/utils/ranking.ts`).
- **Toasts**: `ToastStore.show(message)` (errors, 4 s), `show(message, 'success')` to confirm a change saved. A modal dialog hides the page below it, so a modal open while a toast can show (search dialogs, celebration) renders its own `<app-toast-outlet />` inside the `<dialog>`: the last outlet created renders the toasts.
- **Styles**: global reset and `body` styles in `src/styles.scss`. `responsive.scss` and `_auth-forms.scss` in `src/styles/`, imported with `@use 'responsive';` (`stylePreprocessorOptions.includePaths`).
- **Chips**: every pill chip takes its size from `@include chip.size;` (`src/styles/_chip.scss`, 28px high like the "See all" chips of the home page) and only sets its colors.
- **Hover**: every link, button and chip has one, and it only changes the background: never a transform (translate, scale), a shadow, or a change of opacity, color or border.
- **Import alias**: `@/*` → `src/app/*`.

## Tests

- **Components**: `TestBed.createComponent(...)`, inputs set with `fixture.componentRef.setInput(...)`, DOM events with `fixture.nativeElement.querySelector(...).click()` then `await fixture.whenStable()`.
- **HTTP**: `provideHttpClient()` + `provideHttpClientTesting()`, then `HttpTestingController` (`expectOne`, `flush`, `verify`).
- **Dependencies**: hand-written fakes in TestBed `providers: [{ provide: RatingApi, useValue: fake }]`.
- **Browser APIs** (`navigator.geolocation`, `navigator.permissions`): wrapped in `core/location/`, faked through that service.
