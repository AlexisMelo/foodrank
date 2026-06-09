namespace api.Services;

public interface ISupabaseAuthService
{
    Task<string?> SignInAsync(string email, string password);
    Task<string?> SignUpAsync(string email, string password);
    Task<bool> ValidateAccessTokenAsync(string accessToken);
    Task SendPasswordResetEmailAsync(string email, string redirectUrl);
    Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword);
}
