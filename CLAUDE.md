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
dotnet test       # run tests
```

### Frontend (`apps/frontend`)

- **Framework:** Vue 3 + TypeScript (Vite)
- **Router:** Vue Router 5
- **Testing:** Vitest + @vue/test-utils
- **Linting:** oxlint + ESLint + Prettier
- **Path alias:** `@` maps to `src/`

```bash
cd apps/frontend
npm install           # install dependencies
npm run dev           # start dev server
npm run test:unit     # run unit tests
npm run build         # type-check + production build
npm run lint          # lint and auto-fix
npm run format        # format with prettier
```

## Development

The frontend and API are developed and run independently. There is currently no shared code or root-level build script.
