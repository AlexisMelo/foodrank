using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ISupabaseAuthService"/>, replacing Supabase Auth in API tests. Only the token → user lookup is
/// implemented; the other operations are not used by the tested endpoints.
/// </summary>
public class FakeSupabaseAuthService : ISupabaseAuthService
{
    /// <summary>
    /// Valid access tokens, mapped to the id of their user.
    /// </summary>
    public Dictionary<string, string> UserIdsByToken { get; } = [];

    /// <inheritdoc />
    public Task<string?> GetUserIdAsync(string? accessToken)
        => Task.FromResult(accessToken is not null && UserIdsByToken.TryGetValue(accessToken, out string? userId) ? userId : null);

    /// <inheritdoc />
    public Task<string?> SignInAsync(string email, string password) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task<string?> SignUpAsync(string email, string password) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task SendPasswordResetEmailAsync(string email, string redirectUrl) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword) => throw new NotImplementedException();
}
