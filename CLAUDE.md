# FoodRank

A monorepo containing an angular frontend and a .NET Core backend API.
The point is to build a restaurant ranking application. Restaurants are rated based on 3 criterias : food, service, and the setting. User can optionnaly give a "favorite" bonus, that does not contribute to the note, but can show a particular interest for the restaurant.

## Repo structure

```
foodrank/
└── apps/
    ├── api/        # ASP.NET Core 10 Web API
    └── frontend/   # Angular 22 + TypeScript SPA
```

## Apps

### API (`apps/api`)

For any change in apps/api, load the dotnet-best-practices skill before writing code.

**Prerequisites: check them before any change in apps/api, and abort if one is missing.** Before reading or writing any code, check that all of these are available:

- the `dotnet-best-practices` skill (listed in the available skills);
- an up-to-date .NET SDK: `dotnet --list-sdks` lists an SDK of the major version targeted by the projects (`<TargetFramework>` in `apps/api/api.csproj` and `apps/api/tests/Api.Tests/Api.Tests.csproj`, currently `net10.0`);
- the NuGet packages: `dotnet restore apps/api` succeeds.

If any of them is missing or out of date, **stop immediately**: make no change at all (no file created, edited or deleted), list what is missing and let the user install it. Never work around a missing prerequisite (no SDK downloaded or retargeted, no package version changed to match what is installed, no skill skipped).

### Frontend (`apps/frontend`)

For any change in apps/frontend, load the angular-developer skill before writing code.

**Prerequisites: check them before any change in apps/frontend, and abort if one is missing.** Before reading or writing any code, check that all of these are available:

- the `angular-developer` skill (listed in the available skills);
- the `angular-new-app` skill (listed in the available skills);
- the Angular CLI MCP server (its tools, e.g. `get_best_practices` and `search_documentation`, are available);
- an up-to-date Node.js: `node -v` meets the minimum required by the installed Angular CLI;
- an up-to-date Angular CLI: `npx ng version` runs from `apps/frontend` and matches the version in `apps/frontend/package.json`.

If any of them is missing or out of date, **stop immediately**: make no change at all (no file created, edited or deleted), list what is missing and let the user install it. Never work around a missing prerequisite (no portable Node or CLI downloaded, no hand-written replacement for `ng generate`, no skill skipped).

### GitHub issues

When asked to work on a GitHub issue, create a dedicated branch **before reading or changing any code**: `git switch main`, `git pull`, then `git switch -c <type>/<issue-number>-<short-slug>` (type: `feat`, `fix`, `refactor` or `chore`; e.g. `fix/42-rating-rounding`). If the working tree is not clean, stop and ask.

### Commits

**Never commit.** All commits are made manually by the user. Do not run any git command that creates or rewrites a commit (`commit`, `merge`, `cherry-pick`, `revert`, `rebase`, `am`, `commit-tree`); a `PreToolUse` hook (`.claude/hooks/block-git-commit.js`) blocks them. Leave the changes in the working tree (do not stage them). When an issue specifies a commit message, give it in the final summary for the user to use.

### Workflow for every change (feature, bugfix, refactor)

1. **Write the tests with the code**, in the same task: new behavior → new tests; changed behavior → updated tests; bugfix → first a test that reproduces the bug.
2. **Run the tests of the app(s) touched before proposing the solution**: `npm run test:api` for an API change, `npm run test:front` for a frontend change, `npm test` when both are touched or an API contract used by the frontend changes. Each suite runs in a few seconds, so run the whole suite of the app, not a subset.
3. **Only propose the solution once the tests pass.** If a test fails, fix the code (or the test if the expected behavior really changed, saying so). Never delete, skip or weaken an existing test without telling the user.
4. **In the final summary**, list the tests added or changed and give the result of the run.

### What to test

- Test behavior that can break: business rules, validation, error handling, mapping, ranking, state changes. Do not test purely presentational components or framework code.
- No new test library without asking: fakes are hand-written, no mocking or assertion library. The test runner's built-in helpers are fine (Vitest's `vi.fn()`).
