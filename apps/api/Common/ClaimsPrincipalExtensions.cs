using System.Security.Claims;

namespace api.Common;

/// <summary>
/// Reads the logged-in user set by <see cref="SupabaseAuthenticationHandler"/>.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Returns the Supabase id of the logged-in user. Only call it from endpoints requiring authentication
    /// (all of them unless marked <c>[AllowAnonymous]</c>): an anonymous user has no id and throws.
    /// </summary>
    public static string GetUserId(this ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("No authenticated user: is the endpoint marked [AllowAnonymous]?");
}
