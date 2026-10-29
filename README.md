# FoodRank

FoodRank is a restaurant ranking app. Users rate the restaurants they visit on three criteria (food, service and setting), and can mark a restaurant as a favorite: the favorite bonus shows a particular interest without changing the score.

Users can also:

- find restaurants near them with a search backed by OpenStreetMap;
- see their restaurants ranked on their profile, and group them into tierlists;
- follow other users and see their latest ratings on the community page.

## Stack

| Part     | Technology                                     | Folder          |
| -------- | ---------------------------------------------- | --------------- |
| Frontend | Angular 22, TypeScript, Vitest                 | `apps/frontend` |
| API      | ASP.NET Core 10 Web API, xUnit                 | `apps/api`      |
| Data     | Supabase (PostgreSQL database and Auth)        | hosted          |
| Places   | Photon and Nominatim (OpenStreetMap geocoding) | external        |

The frontend only talks to the API (`/api/...`). The API talks to Supabase and keeps the session in an HttpOnly cookie.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 22.22.3+ or 24.15+ (required by the Angular CLI)
- A Supabase project with the FoodRank tables: `profiles`, `restaurants`, `rating`, `tierlists`, `tierlist_restaurant` and `follow`

## Setup

1. Install the dependencies:

   ```sh
   npm install
   npm install --prefix apps/frontend
   ```

2. Create `apps/api/appsettings.Development.json` (it is git-ignored, never commit it) with your Supabase keys and the frontend URL:

   ```json
   {
     "Supabase": {
       "Url": "https://<your-project>.supabase.co",
       "ServiceRoleKey": "<service role key>",
       "AnonKey": "<anon key>"
     },
     "Frontend": {
       "Url": "http://localhost:4200"
     }
   }
   ```

   `Frontend:Url` is used in the links of the password reset emails.

## Run

```sh
npm start
```

This starts both apps:

- the API on https://localhost:7207 (`dotnet watch`, reloads on change);
- the frontend on http://localhost:4200, which forwards `/api` to the API (`apps/frontend/proxy.conf.json`).

Open http://localhost:4200 and sign up.

## Test

```sh
npm test            # both apps
npm run test:api    # API only (xUnit)
npm run test:front  # frontend only (Vitest)
```

Lint and build the frontend from `apps/frontend` with `npm run lint` and `npm run build`.

## Repository structure

```
foodrank/
├── apps/
│   ├── api/          # ASP.NET Core Web API
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Models/
│   │   └── tests/    # xUnit tests, with in-memory fakes of the services
│   └── frontend/     # Angular app
│       └── src/app/
│           ├── core/      # API clients, models, stores, pure functions
│           ├── features/  # one folder per page
│           ├── layout/    # app shell, tab bar, top bar
│           └── shared/    # reusable components, pipes and data loaders
└── package.json      # scripts running both apps
```

Coding conventions for each app are in `CLAUDE.md` (root) and `apps/frontend/CLAUDE.md`.
