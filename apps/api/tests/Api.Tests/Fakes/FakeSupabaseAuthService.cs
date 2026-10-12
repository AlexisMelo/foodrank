using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ISupabaseAuthService"/>, replacing Supabase Auth in API tests. Only the token → user lookup and
/// the sign up are implemented; the other operations are not used by the tested endpoints.
/// </summary>
public class FakeSupabaseAuthService : ISupabaseAuthService
{
    /// <summary>
    /// Valid access tokens, mapped to the id of their user.
    /// </summary>
    public Dictionary<string, string> UserIdsByToken { get; } = [];

    /// <summary>
    /// Accounts "registered in Supabase Auth", mapped to the id of their user. Emails are case-insensitive, like in
    /// Supabase.
    /// </summary>
    public Dictionary<string, string> UserIdsByEmail { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// When false, signing up creates the account without session, like Supabase when the email must be confirmed.
    /// </summary>
    public bool OpensSessionOnSignUp { get; set; } = true;

    /// <inheritdoc />
    public Task<string?> GetUserIdAsync(string? accessToken)
        => Task.FromResult(accessToken is not null && UserIdsByToken.TryGetValue(accessToken, out string? userId) ? userId : null);

    /// <inheritdoc />
    public Task<string?> SignInAsync(string email, string password) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task<Result<AuthSession>> SignUpAsync(string email, string password)
    {
        if (UserIdsByEmail.ContainsKey(email))
            return Task.FromResult(Result<AuthSession>.Failure(SupabaseAuthService.EmailTaken));

        string userId = Guid.NewGuid().ToString();
        UserIdsByEmail[email] = userId;
        if (!OpensSessionOnSignUp)
            return Task.FromResult(Result<AuthSession>.Failure(SupabaseAuthService.NoSession));

        string token = $"token-{userId}";
        UserIdsByToken[token] = userId;
        return Task.FromResult(Result<AuthSession>.Success(new AuthSession(userId, token)));
    }

    /// <inheritdoc />
    public Task SendPasswordResetEmailAsync(string email, string redirectUrl) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword) => throw new NotImplementedException();
}
