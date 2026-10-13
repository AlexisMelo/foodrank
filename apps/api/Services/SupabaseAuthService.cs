using api.Common;
using api.Models;
using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Supabase.Gotrue.Interfaces;

namespace api.Services;

/// <summary>
/// Handles user authentication through Supabase Auth (GoTrue), with a per-request client so sessions never leak between requests.
/// </summary>
/// <param name="auth">GoTrue client scoped to the current request.</param>
/// <param name="admin">GoTrue admin client (service role key), for the operations on any account, like deleting it.</param>
/// <param name="logger">Logger keeping the details of the Supabase Auth failures hidden from the client.</param>
public class SupabaseAuthService(Supabase.Gotrue.Client auth, IGotrueAdminClient<User> admin, ILogger<SupabaseAuthService> logger) : ISupabaseAuthService
{
    /// <summary>
    /// GoTrue client scoped to the current request.
    /// </summary>
    private readonly Supabase.Gotrue.Client _auth = auth ?? throw new ArgumentNullException(nameof(auth));

    /// <summary>
    /// GoTrue admin client (service role key), for the operations on any account.
    /// </summary>
    private readonly IGotrueAdminClient<User> _admin = admin ?? throw new ArgumentNullException(nameof(admin));

    /// <summary>
    /// Logger keeping the details of the Supabase Auth failures hidden from the client.
    /// </summary>
    private readonly ILogger<SupabaseAuthService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Error returned when signing up with the email of an existing account.
    /// </summary>
    public static Error EmailTaken { get; } = new(ErrorType.Conflict, "An account with this email already exists.");

    /// <summary>
    /// Error returned when the account was created without session (Supabase requires an email confirmation first).
    /// </summary>
    public static Error NoSession { get; } = new(ErrorType.Unauthorized, "The account was created but no session could be opened.");

    /// <summary>
    /// Error returned when Supabase Auth fails for a reason the user cannot fix (database error, outage...).
    /// </summary>
    public static Error SignUpUnavailable { get; } = new(ErrorType.Unavailable, "The account could not be created. Please try again later.");

    /// <summary>
    /// Error returned when the password confirming a sensitive operation is wrong. Forbidden rather than Unauthorized:
    /// the user stays logged in.
    /// </summary>
    public static Error WrongPassword { get; } = new(ErrorType.Forbidden, "Incorrect password.");

    /// <summary>
    /// Error returned when Supabase Auth fails while checking the password or deleting the account.
    /// </summary>
    public static Error DeleteAccountUnavailable { get; } = new(ErrorType.Unavailable, "The account could not be deleted. Please try again later.");

    /// <inheritdoc />
    public async Task<Result<AuthSession>> SignUpAsync(string email, string password)
    {
        try
        {
            Session? session = await _auth.SignUp(email, password);
            return session?.User?.Id is { } userId && !string.IsNullOrEmpty(session.AccessToken)
                ? Result<AuthSession>.Success(new AuthSession(userId, session.AccessToken))
                : Result<AuthSession>.Failure(NoSession);
        }
        catch (GotrueException ex) when (ex.Reason == FailureHint.Reason.UserAlreadyRegistered)
        {
            return Result<AuthSession>.Failure(EmailTaken);
        }
        catch (GotrueException ex) when (ex.Reason is FailureHint.Reason.UserBadEmailAddress or FailureHint.Reason.UserBadPassword)
        {
            return Result<AuthSession>.Failure(new Error(ErrorType.Validation, "The email address or the password was refused."));
        }
        catch (GotrueException ex)
        {
            // The message holds Supabase's error_id, needed to find the cause in the Supabase logs
            _logger.LogError(ex, "Supabase Auth sign up failed (HTTP {StatusCode}): {Message}", ex.StatusCode, ex.Message);
            return Result<AuthSession>.Failure(SignUpUnavailable);
        }
    }

    /// <summary>
    /// Sign in user
    /// </summary>
    /// <see cref="https://supabase-community.github.io/gotrue-csharp/api/Supabase.Gotrue.StatelessClient.html?q=signin#Supabase_Gotrue_StatelessClient_SignIn_System_String_System_String_Supabase_Gotrue_StatelessClient_StatelessClientOptions_"/>
    /// <param name="email"></param>
    /// <param name="password"></param>
    /// <returns></returns>
    public async Task<string?> SignInAsync(string email, string password)
    {
        Session? session = await _auth.SignIn(email, password);
        return session?.AccessToken;
    }

    /// <inheritdoc />
    public async Task<string?> GetUserIdAsync(string? accessToken)
    {
        if (string.IsNullOrEmpty(accessToken))
            return null;

        try
        {
            User? user = await _auth.GetUser(accessToken);
            return user?.Id;
        }
        catch (GotrueException)
        {
            // Expired or forged token
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<Result<bool>> CheckPasswordAsync(string userId, string password)
    {
        try
        {
            User? user = await _admin.GetUserById(userId);
            if (string.IsNullOrEmpty(user?.Email))
            {
                _logger.LogError("Supabase Auth user {UserId} has no email: its password cannot be checked", userId);
                return Result<bool>.Failure(DeleteAccountUnavailable);
            }

            Session? session = await _auth.SignIn(user.Email, password);
            return session?.AccessToken is null
                ? Result<bool>.Failure(WrongPassword)
                : Result<bool>.Success(true);
        }
        catch (GotrueException ex) when (ex.Reason is FailureHint.Reason.UserBadLogin or FailureHint.Reason.UserBadMultiple or FailureHint.Reason.UserBadPassword)
        {
            return Result<bool>.Failure(WrongPassword);
        }
        catch (GotrueException ex)
        {
            _logger.LogError(ex, "Supabase Auth password check of user {UserId} failed (HTTP {StatusCode}): {Message}", userId, ex.StatusCode, ex.Message);
            return Result<bool>.Failure(DeleteAccountUnavailable);
        }
    }

    /// <inheritdoc />
    public async Task<Result<bool>> DeleteUserAsync(string userId)
    {
        try
        {
            await _admin.DeleteUser(userId);
            return Result<bool>.Success(true);
        }
        catch (GotrueException ex)
        {
            _logger.LogError(ex, "Supabase Auth deletion of user {UserId} failed (HTTP {StatusCode}): {Message}", userId, ex.StatusCode, ex.Message);
            return Result<bool>.Failure(DeleteAccountUnavailable);
        }
    }

    public async Task SendPasswordResetEmailAsync(string email, string redirectUrl)
    {
        await _auth.ResetPasswordForEmail(new ResetPasswordForEmailOptions(email)
        {
            RedirectTo = redirectUrl
        });
    }

    public async Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword)
    {
        Session? session = await _auth.SetSession(accessToken, refreshToken);
        if (session?.User == null)
            return null;

        await _auth.Update(new UserAttributes { Password = newPassword });
        return session.AccessToken;
    }
}
