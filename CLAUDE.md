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

For any change in apps/api, load the dotnet-best-practices skill before writing code.

### Frontend (`apps/frontend`)

For any change in apps/frontend, load the vue-best-practices skill before writing code.

### Workflow for every change (feature, bugfix, refactor)

1. **Write the tests with the code**, in the same task: new behavior → new tests; changed behavior → updated tests; bugfix → first a test that reproduces the bug.
2. **Run the tests of the app(s) touched before proposing the solution**: `npm run test:api` for an API change, `npm run test:front` for a frontend change, `npm test` when both are touched or an API contract used by the frontend changes. Each suite runs in a few seconds, so run the whole suite of the app, not a subset.
3. **Only propose the solution once the tests pass.** If a test fails, fix the code (or the test if the expected behavior really changed, saying so). Never delete, skip or weaken an existing test without telling the user.
4. **In the final summary**, list the tests added or changed and give the result of the run.

### What to test

- Test behavior that can break: business rules, validation, error handling, mapping, ranking, state changes. Do not test purely presentational components or framework code.
- No new test library without asking: fakes are hand-written, no mocking or assertion library.
