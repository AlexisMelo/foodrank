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

    /// <summary>
    /// Checks that <paramref name="password"/> is the current password of <paramref name="userId"/>, by signing in
    /// with the email of the account.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user.</param>
    /// <param name="password">Password entered by the user.</param>
    /// <returns>Success when the password is right; a Forbidden failure when it is wrong, an Unavailable failure when
    /// Supabase Auth fails.</returns>
    Task<Result<bool>> CheckPasswordAsync(string userId, string password);

    /// <summary>
    /// Deletes the Supabase Auth account of <paramref name="userId"/>: its access tokens stop being accepted. The
    /// database deletes the user's rows (profile, ratings, tierlists) in the same transaction, through ON DELETE
    /// CASCADE foreign keys to auth.users; the deletion must stay a hard delete for them to apply.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the account to delete.</param>
    /// <returns>Success once deleted; an Unavailable failure when Supabase Auth fails.</returns>
    Task<Result<bool>> DeleteUserAsync(string userId);

    Task SendPasswordResetEmailAsync(string email, string redirectUrl);

    /// <summary>
    /// Opens the session of a reset password link, then sets the new password of its account.
    /// </summary>
    /// <param name="accessToken">access_token of the reset password link.</param>
    /// <param name="refreshToken">refresh_token of the reset password link.</param>
    /// <param name="newPassword">New password of the account.</param>
    /// <returns>The access token of the session opened; an Unauthorized failure when the link is invalid or expired,
    /// a Validation failure when Supabase refuses the password, an Unavailable failure when Supabase Auth fails.</returns>
    Task<Result<string>> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword);
}
