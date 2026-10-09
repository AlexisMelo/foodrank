# FoodRank

A monorepo containing a Vue.js frontend and a .NET Core backend API.
The point is to build a restaurant ranking application. Restaurants are rated based on 3 criterias : food, service, and the setting. User can optionnaly give a "favorite" bonus that adds to the global note, based on his appreciation and no real criteria.

## Repo structure

```
foodrank/
└── apps/
    ├── api/        # ASP.NET Core 10 Web API
    └── frontend/   # Vue 3 + TypeScript SPA
```

## Apps

### API (`apps/api`)

- **Runtime:** .NET 10
- **Type:** ASP.NET Core Web API with controllers
- **OpenAPI:** enabled via `Microsoft.AspNetCore.OpenApi`, available at `/openapi/v1.json` in development

```bash
cd apps/api
dotnet run        # start dev server
dotnet build      # build
dotnet test -c Release   # run tests (Release: `npm start` locks bin/Debug)
```

### Frontend (`apps/frontend`)

For any change in apps/frontend, load the vue-best-practices skill before writing code.

- **Framework:** Vue 3 + TypeScript (Vite)
- **Router:** Vue Router 5
- **Testing:** Vitest + @vue/test-utils
- **Linting:** oxlint + ESLint + Prettier
- **Path alias:** `@` maps to `src/`

```bash
cd apps/frontend
npm install           # install dependencies
npm run dev           # start dev server
npm test              # run unit tests once
npm run test:unit     # run unit tests in watch mode
npm run build         # type-check + production build
npm run lint          # lint and auto-fix
npm run format        # format with prettier
npm run gen:types     # regenerate src/types/database.types.ts from the Supabase schema (needs `npx supabase login` once)
```

`src/types/database.types.ts` is generated from the Supabase database (tables `restaurants`, `rating`, `profiles`): use it as the reference for column names, never edit it by hand.

## Development

The frontend and API have no shared code and can still be run independently. A root `package.json` uses `concurrently` to start both at once:

```bash
npm install   # at the root (installs concurrently)
npm start     # runs `dotnet watch` on the API (https profile, port 7207) + Vite dev server
```

The API must use the `https` launch profile because the Vite proxy targets `https://localhost:7207`.

## Testing

Tests are local only: no CI, no git hook. Claude is the one who writes and runs them.

```bash
npm test             # at the root: API then frontend tests
npm run test:api     # API only (xUnit, apps/api/tests/Api.Tests)
npm run test:front   # frontend only (Vitest)
```

### Workflow for every change (feature, bugfix, refactor)

1. **Write the tests with the code**, in the same task: new behavior → new tests; changed behavior → updated tests; bugfix → first a test that reproduces the bug.
2. **Run the tests of the app(s) touched before proposing the solution**: `npm run test:api` for an API change, `npm run test:front` for a frontend change, `npm test` when both are touched or an API contract used by the frontend changes. Each suite runs in a few seconds, so run the whole suite of the app, not a subset.
3. **Only propose the solution once the tests pass.** If a test fails, fix the code (or the test if the expected behavior really changed, saying so). Never delete, skip or weaken an existing test without telling the user.
4. **In the final summary**, list the tests added or changed and give the result of the run.

### What to test

- Test behavior that can break: business rules, validation, error handling, mapping, ranking, state changes. Do not test purely presentational components or framework code.
- No new test library without asking: fakes are hand-written, no mocking or assertion library.
- API conventions: see "Testing" in `apps/api/claude.md`.
- Frontend conventions:
  - Tests live in a `__tests__/` folder next to the code (`src/services/__tests__/restaurantService.spec.ts`).
  - Mock HTTP calls with `vi.mock('axios', ...)` and `vi.stubEnv('VITE_API_BASE_URL', ...)`; never call the real API.
  - Composables keep their state at module level: use `vi.resetModules()` then a dynamic `import()` so each test starts fresh.
  - Components with logic are tested with `mount` from @vue/test-utils, by interacting like a user (fill inputs, click, submit) and checking the rendered output and emitted events. Mock the composables they use with `vi.mock`.
  - Browser APIs missing in jsdom (geolocation...) are replaced with `vi.stubGlobal`.
