namespace api.Common;

/// <summary>
/// Rules shared by the endpoints taking a user id in their url.
/// </summary>
public static class UserIds
{
    /// <summary>
    /// Error returned for an id that is not a user id.
    /// </summary>
    public static Error NotFound { get; } = new(ErrorType.NotFound, "User not found.");

    /// <summary>
    /// Tells whether <paramref name="userId"/> can be a Supabase Auth user id. They are uuids: querying with another
    /// format makes PostgreSQL fail instead of returning no row, so callers must check it first.
    /// </summary>
    /// <param name="userId">Id read from the url.</param>
    /// <returns>True when <paramref name="userId"/> is a uuid.</returns>
    public static bool IsValid(string userId) => Guid.TryParse(userId, out _);
}
