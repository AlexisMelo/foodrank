namespace api.Services;

public interface ISupabaseAuthService
{
    Task<string?> SignInAsync(string email, string password);
    Task<string?> SignUpAsync(string email, string password);

    /// <summary>
    /// Returns the id of the user owning <paramref name="accessToken"/>, or null when the token is missing or invalid.
    /// </summary>
    Task<string?> GetUserIdAsync(string? accessToken);

    Task SendPasswordResetEmailAsync(string email, string redirectUrl);
    Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword);
}
