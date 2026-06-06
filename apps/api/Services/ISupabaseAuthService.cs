namespace api.Services;

public interface ISupabaseAuthService
{
    Task<string?> SignInAsync(string email, string password);
    Task<string?> SignUpAsync(string email, string password);
    Task<bool> ValidateAccessTokenAsync(string accessToken);
}
