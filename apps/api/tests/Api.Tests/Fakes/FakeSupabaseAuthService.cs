using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ISupabaseAuthService"/>, replacing Supabase Auth in API tests. Only the token → user lookup,
/// the sign up, the password check and reset, and the account deletion are implemented; the other operations are not
/// used by the tested endpoints.
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

    /// <summary>
    /// When set, signing up throws this exception, like an unexpected failure of Supabase Auth.
    /// </summary>
    public Exception? SignUpException { get; set; }

    /// <summary>
    /// Passwords of the accounts, by user id; checking the password of an account missing here fails.
    /// </summary>
    public Dictionary<string, string> PasswordsByUserId { get; } = [];

    /// <summary>
    /// When true, deleting an account fails like an outage of Supabase Auth, and the account is kept.
    /// </summary>
    public bool DeleteUserFails { get; set; }

    /// <summary>
    /// Ids of the accounts deleted, in order.
    /// </summary>
    public List<string> DeletedUserIds { get; } = [];

    /// <summary>
    /// Access tokens of the valid reset password links, mapped to the id of their user; resetting with another token
    /// fails like an expired link.
    /// </summary>
    public Dictionary<string, string> UserIdsByRecoveryToken { get; } = [];

    /// <summary>
    /// When set, resetting the password with a valid link fails with this error (password refused by Supabase,
    /// outage), and the password is kept.
    /// </summary>
    public Error? ResetPasswordError { get; set; }

    /// <inheritdoc />
    public Task<string?> GetUserIdAsync(string? accessToken)
        => Task.FromResult(accessToken is not null && UserIdsByToken.TryGetValue(accessToken, out string? userId) ? userId : null);

    /// <inheritdoc />
    public Task<Result<bool>> CheckPasswordAsync(string userId, string password)
        => Task.FromResult(PasswordsByUserId.TryGetValue(userId, out string? expected) && expected == password
            ? Result<bool>.Success(true)
            : Result<bool>.Failure(SupabaseAuthService.WrongPassword));

    /// <inheritdoc />
    public Task<Result<bool>> DeleteUserAsync(string userId)
    {
        if (DeleteUserFails)
            return Task.FromResult(Result<bool>.Failure(SupabaseAuthService.DeleteAccountUnavailable));

        // Like Supabase, the tokens of a deleted account are refused
        foreach (string token in UserIdsByToken.Where(t => t.Value == userId).Select(t => t.Key).ToList())
            UserIdsByToken.Remove(token);
        foreach (string email in UserIdsByEmail.Where(e => e.Value == userId).Select(e => e.Key).ToList())
            UserIdsByEmail.Remove(email);
        PasswordsByUserId.Remove(userId);
        DeletedUserIds.Add(userId);
        return Task.FromResult(Result<bool>.Success(true));
    }

    /// <inheritdoc />
    public Task<string?> SignInAsync(string email, string password) => throw new NotImplementedException();

    /// <inheritdoc />
    public Task<Result<AuthSession>> SignUpAsync(string email, string password)
    {
        if (SignUpException is not null)
            throw SignUpException;
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
    public Task<Result<string>> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword)
    {
        if (!UserIdsByRecoveryToken.TryGetValue(accessToken, out string? userId))
            return Task.FromResult(Result<string>.Failure(SupabaseAuthService.ResetLinkExpired));
        if (ResetPasswordError is not null)
            return Task.FromResult(Result<string>.Failure(ResetPasswordError));

        PasswordsByUserId[userId] = newPassword;
        string token = $"token-{userId}";
        UserIdsByToken[token] = userId;
        return Task.FromResult(Result<string>.Success(token));
    }
}
