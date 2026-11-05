# FoodRank API (ASP.NET Core)

Generic .NET guidance comes from the `dotnet-best-practices` skill (primary constructors, async/await, XML docs, SOLID…). This file only holds the FoodRank-specific decisions, and wins when the two disagree: the skill's MSTest, FluentAssertions and Moq are not used here (see [Tests](#tests)), nor are its Command Handler, `ResourceManager` and Semantic Kernel sections.

## Commands

Run from the repo root: `npm run test:api`, `npm start` (API and frontend together). Run from `apps/api`: `dotnet build`, `dotnet run --launch-profile https` (API on `https://localhost:7207`). Local secrets live in `appsettings.Development.json` (git-ignored).

## Comments

- **Every member has a `///` doc comment**, private ones included (fields, constants). The build only warns about public members (`CS1591`, see `.editorconfig`): check the private ones yourself before proposing a change.
- Say what the code does not: unit or range, when a value is `null`, where it comes from, and why it exists when that is not obvious. Actions list their status codes in `<returns>`.

## Architecture decisions

- **Layers**: `Controllers` (thin actions) → `Services` (one interface each, for the fakes) → Supabase. Rules shared by several features go in `Common`.
- **Errors**: expected failures are a `Result<T>` holding an `Error`, and `ToActionResult()` maps its `ErrorType` to the status code. Exceptions are for the unexpected: `GlobalExceptionHandler` logs them and answers a generic 500. Services only catch the database errors they expect, with `PostgrestErrors` (e.g. a unique violation).
- **Endpoints**: return `ActionResult<T>`, never `IActionResult`, so the signature tells the 200 body (checked by `ResponseTypesTests`). Only the account endpoints answering an empty 200 are exempt.
- **Models**: tables are `BaseModel` classes, requests and responses are `*Request` / `*Response` records. Requests validate with data annotations (custom ones in `Common`). Responses map from the rows with a static `From(...)`.
- **Auth**: secure by default, every endpoint requires a logged-in user unless marked `[AllowAnonymous]`. The session is the Supabase access token in the HttpOnly `foodrank_token` cookie, read by `SupabaseAuthenticationHandler`. Controllers get the user with `User.GetUserId()`.
- **Supabase clients**: the shared data client uses the service role key. Auth has its own scoped client, because signing in stores the user's session in the client, which would make the shared one send the user's JWT and apply RLS to every request. Never sign in with the data client.
- **User ids in urls**: check them with `UserIds.IsValid` before any query (PostgreSQL fails on a non-uuid instead of returning no row) and answer `UserIds.NotFound`.
- **Place search**: goes through `IPlaceProvider` (Photon and Nominatim, OpenStreetMap), so changing provider only changes its registration. Endpoints calling these free services use the `RateLimitPolicies.Places` limit, so abuse can't get the server throttled or banned.

## Tests

- **Stack**: xUnit and its `Assert` only. Fakes are hand-written, in `tests/Api.Tests/Fakes`.
- **Controllers**: through HTTP with `ApiFactory`, the real API in memory with the services replaced by fakes (no network, no `appsettings.Development.json`). One factory per test.
- **Services**: the real service, without a database. Rules are public static methods tested directly. Queries are public static methods too, tested on the URL from `GenerateUrl()`, without sending them.
