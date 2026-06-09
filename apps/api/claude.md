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

## Git Workflow

## Domain Terms
