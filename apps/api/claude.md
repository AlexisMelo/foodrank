# CLAUDE.md - Foodrank

## Overview

This project is the API for the foodrank app. It handles communication between the client in Vue.js and the supabase database used to store all information.

## Tech Stack

- .NET 10, ASP.NET Core Minimal APIs
- Entity Framework Core 10 connected to Supabase (PostgreSQL)

## Project Structure

## Architecture Rules

- When creating a controller, check wether creating a dedicated Service is useful

## Code Conventions

- Always write a few lines of documentation above new functions
- Every class member (constant, field, property, enum value) must have a `/// <summary>` describing it, including private ones. For positional records, document each property with a `/// <param>` tag.
- Separate every member declaration with a blank line (no consecutive constants/fields without an empty line between them).
- Public members are checked at build time (CS1591, see `.editorconfig`); private members and blank lines are not checked by any tool, so apply them manually.

### Naming

### Patterns We Use

- Primary constructors for DI
- Records for DTOs and commands
- Result<T> pattern for error handling (no exceptions for flow control)
- File-scoped namespaces
- Always pass CancellationToken to async methods
- Always use explicit types
- In Controllers, code should be minimal and be one-liners as much as possible, letting services handle logic

### Patterns We DON'T Use (Never Suggest)

- Repository pattern (use EF Core directly)
- AutoMapper (write explicit mappings)
- Exceptions for business logic errors
- Stored procedures
- Avoid using var anywhere.

## Validation

## Testing

See the testing workflow in the root `CLAUDE.md`. API specifics:

- xUnit project in `tests/Api.Tests` (part of `api.slnx`, excluded from the API build by `DefaultItemExcludes` in `api.csproj`). Its folders mirror the API (`Services/Places/PlaceRankingTests.cs` tests `Services/Places/PlaceRanking.cs`).
- Run with `dotnet test -c Release` (or `npm run test:api` at the root): the dev server started by `npm start` locks `bin/Debug`.
- Test names: `Method_Scenario_ExpectedResult`. Same code conventions as the API (explicit types, `/// <summary>` on every member, including test methods).
- Pure logic and services: instantiate the class directly, with hand-written fakes from `tests/Api.Tests/Fakes` for its dependencies (no mocking library).
- Controllers: send HTTP requests to `ApiFactory`, which runs the real API in memory (routing, rate limiting, `Result` → status code) with fakes instead of Supabase and OpenStreetMap. It uses the `Testing` environment with dummy settings, so tests never depend on the network or on `appsettings.Development.json`. When a new service talks to Supabase or an external API, replace it in `ApiFactory`.
- Code that calls Supabase directly (`RestaurantService`) is not unit-tested: it is replaced by a fake in controller tests.

## Git Workflow

## Domain Terms
