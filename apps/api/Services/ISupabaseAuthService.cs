using api.Common;
using api.Models;

namespace api.Services;

public interface ISupabaseAuthService
{
    Task<string?> SignInAsync(string email, string password);

    /// <summary>
    /// Creates a Supabase Auth account and opens its session.
    /// </summary>
    /// <param name="email">Email address of the account.</param>
    /// <param name="password">Password of the account.</param>
    /// <returns>The session of the new account; a Conflict failure when the email is already used, a Validation
    /// failure when Supabase rejects the email or the password, an Unauthorized failure when no session was opened.</returns>
    Task<Result<AuthSession>> SignUpAsync(string email, string password);

    /// <summary>
    /// Returns the id of the user owning <paramref name="accessToken"/>, or null when the token is missing or invalid.
    /// </summary>
    Task<string?> GetUserIdAsync(string? accessToken);

    Task SendPasswordResetEmailAsync(string email, string redirectUrl);
    Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword);
}
