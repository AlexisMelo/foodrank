using Supabase.Postgrest.Exceptions;

namespace api.Common;

/// <summary>
/// Helpers recognizing the PostgreSQL errors returned by PostgREST.
/// </summary>
public static class PostgrestErrors
{
    /// <summary>
    /// True when PostgREST rejected a write because of a unique constraint (PostgreSQL 23505, HTTP 409).
    /// </summary>
    public static bool IsUniqueViolation(PostgrestException ex)
        => ex.StatusCode == 409 && ex.Content?.Contains("23505") == true;

    /// <summary>
    /// True when PostgREST rejected a write because a foreign key points to no row (PostgreSQL 23503, HTTP 409).
    /// </summary>
    public static bool IsForeignKeyViolation(PostgrestException ex)
        => ex.StatusCode == 409 && ex.Content?.Contains("23503") == true;
}
