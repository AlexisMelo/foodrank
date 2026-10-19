namespace api.Models;

/// <summary>
/// Body of GET /api/auth/me: the user logged in by the session cookie.
/// </summary>
/// <param name="Id">Supabase id of the logged-in user, the same as the <c>id</c> of its profile and the
/// <c>userId</c> of its ratings and tierlists.</param>
public record SessionUserResponse(string Id);
