# CLAUDE.md - Foodrank

## Overview

This project is the API for the foodrank app. It handles communication between the client in Vue.js and the supabase database used to store all information.

## Tech Stack

- .NET 10, ASP.NET Core Minimal APIs
- Entity Framework Core 10 connected to Supabase (PostgreSQL)

## Project Structure

## Architecture Rules

## Code Conventions

### Naming

### Patterns We Use

- Primary constructors for DI
- Records for DTOs and commands
- Result<T> pattern for error handling (no exceptions for flow control)
- File-scoped namespaces
- Always pass CancellationToken to async methods
- Using explicit types

### Patterns We DON'T Use (Never Suggest)

- Repository pattern (use EF Core directly)
- AutoMapper (write explicit mappings)
- Exceptions for business logic errors
- Stored procedures
- Using var everywhere.

## Validation

## Testing

## Git Workflow

## Domain Terms
