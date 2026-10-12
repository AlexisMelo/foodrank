namespace api.Models;

/// <summary>
/// Session opened by Supabase Auth for a user.
/// </summary>
/// <param name="UserId">Supabase Auth id of the user.</param>
/// <param name="AccessToken">Access token of the session, stored in the session cookie.</param>
public record AuthSession(string UserId, string AccessToken);
