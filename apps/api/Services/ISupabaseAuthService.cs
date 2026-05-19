namespace api.Services;

/// <summary>
/// Abstracts Supabase auth operations used by the auth flow.
/// </summary>
public interface ISupabaseAuthService
{
    /// <summary>Sends a magic link email to the given address.</summary>
    Task SendMagicLinkAsync(string email, string redirectUrl);

    /// <summary>
    /// Verifies a magic link token hash and returns the access token on success,
    /// or null if the token is invalid.
    /// </summary>
    Task<string?> VerifyTokenHashAsync(string tokenHash, string type);

    /// <summary>Returns true if the given JWT is valid according to Supabase.</summary>
    Task<bool> ValidateAccessTokenAsync(string accessToken);
}
