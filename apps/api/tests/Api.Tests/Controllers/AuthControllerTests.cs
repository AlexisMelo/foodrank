using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the session, sign up and account deletion endpoints of /api/auth through HTTP, and with them the cookie
/// authentication of every endpoint. They run on the in-memory auth and user services.
/// </summary>
public class AuthControllerTests : IDisposable
{
    /// <summary>
    /// Valid access token of a logged-in user.
    /// </summary>
    private const string Token = "valid-token";

    /// <summary>
    /// In-memory API, recreated for each test.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client and a valid token.
    /// </summary>
    public AuthControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.AuthService.UserIdsByToken[Token] = "user-1";
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Sends a request to <paramref name="url"/>, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? token, object? body = null)
    {
        HttpRequestMessage request = new(method, url) { Content = body is null ? null : JsonContent.Create(body) };
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// Sends a sign up with the valid values of <see cref="ValidSignup"/>, replaced by <paramref name="changes"/>
    /// (a null value removes the field).
    /// </summary>
    private Task<HttpResponseMessage> SignupAsync(Dictionary<string, object?>? changes = null)
    {
        Dictionary<string, object?> body = new(ValidSignup);
        foreach ((string field, object? value) in changes ?? [])
        {
            if (value is null)
                body.Remove(field);
            else
                body[field] = value;
        }
        return _client.PostAsync("/api/auth/signup", JsonContent.Create(body));
    }

    /// <summary>
    /// Body of a valid sign up, as sent by the frontend.
    /// </summary>
    private static readonly Dictionary<string, object?> ValidSignup = new()
    {
        ["email"] = "new@test.fr",
        ["password"] = "abcdefg1",
        ["username"] = "alex",
        ["age"] = 30,
        ["identity"] = "non_binary"
    };

    /// <summary>
    /// Returns the value of the auth cookie set by the response, null when it sets none.
    /// </summary>
    private static string? SessionCookie(HttpResponseMessage response)
        => response.Headers.TryGetValues("Set-Cookie", out IEnumerable<string>? cookies)
            ? cookies
                .Where(cookie => cookie.StartsWith($"{SupabaseAuthenticationHandler.CookieName}="))
                .Select(cookie => cookie.Split(';')[0][(SupabaseAuthenticationHandler.CookieName.Length + 1)..])
                .FirstOrDefault(token => token.Length > 0)
            : null;

    /// <summary>
    /// Returns true when the response tells the browser to delete the auth cookie.
    /// </summary>
    private static bool DeletesCookie(HttpResponseMessage response)
        => response.Headers.TryGetValues("Set-Cookie", out IEnumerable<string>? cookies)
            && cookies.Any(cookie => cookie.StartsWith($"{SupabaseAuthenticationHandler.CookieName}=;") && cookie.Contains("expires=Thu, 01 Jan 1970"));

    /// <summary>
    /// A valid cookie is accepted and kept, and the logged-in user is returned.
    /// </summary>
    [Fact]
    public async Task Me_ValidCookie_Returns200WithUserId()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Get, "/api/auth/me", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(DeletesCookie(response));
        SessionUserResponse? user = await response.Content.ReadFromJsonAsync<SessionUserResponse>();
        Assert.Equal("user-1", user?.Id);
    }

    /// <summary>
    /// Without cookie, the user is not logged in.
    /// </summary>
    [Fact]
    public async Task Me_NoCookie_Returns401()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Get, "/api/auth/me", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(DeletesCookie(response));
    }

    /// <summary>
    /// An expired or forged token is refused, and its cookie deleted so the browser stops sending it.
    /// </summary>
    [Fact]
    public async Task Me_InvalidToken_Returns401AndDeletesCookie()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Get, "/api/auth/me", "expired");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(DeletesCookie(response));
    }

    /// <summary>
    /// Logging out works even with an expired token (the endpoint is anonymous) and deletes the cookie.
    /// </summary>
    [Fact]
    public async Task Logout_InvalidToken_Returns200AndDeletesCookie()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/logout", "expired");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(DeletesCookie(response));
    }

    /// <summary>
    /// With the right password, only the account of the user is deleted (its rows are deleted by the database
    /// cascade), and the user is logged out: its token is refused afterwards.
    /// </summary>
    [Fact]
    public async Task DeleteAccount_RightPassword_DeletesAccountAndLogsOut()
    {
        _factory.AuthService.PasswordsByUserId["user-1"] = "secret";

        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/delete-account", Token, new { password = "secret" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(DeletesCookie(response));
        Assert.Equal(["user-1"], _factory.AuthService.DeletedUserIds);

        HttpResponseMessage me = await SendAsync(HttpMethod.Get, "/api/auth/me", Token);
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    /// <summary>
    /// A wrong password is refused with a 403 (not 401, which the frontend reads as an expired session), and the
    /// account is kept.
    /// </summary>
    [Fact]
    public async Task DeleteAccount_WrongPassword_Returns403AndKeepsAccount()
    {
        _factory.AuthService.PasswordsByUserId["user-1"] = "secret";

        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/delete-account", Token, new { password = "wrong" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("Incorrect password.", await response.Content.ReadAsStringAsync());
        Assert.False(DeletesCookie(response));
        Assert.Empty(_factory.AuthService.DeletedUserIds);
        Assert.Contains(Token, _factory.AuthService.UserIdsByToken);
    }

    /// <summary>
    /// A missing password is refused with a 400, and the account is kept.
    /// </summary>
    [Fact]
    public async Task DeleteAccount_NoPassword_Returns400()
    {
        _factory.AuthService.PasswordsByUserId["user-1"] = "secret";

        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/delete-account", Token, new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.AuthService.DeletedUserIds);
        Assert.Contains(Token, _factory.AuthService.UserIdsByToken);
    }

    /// <summary>
    /// Only a logged-in user can delete its account.
    /// </summary>
    [Fact]
    public async Task DeleteAccount_NotLoggedIn_Returns401()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/delete-account", token: null, new { password = "secret" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.AuthService.DeletedUserIds);
    }

    /// <summary>
    /// When Supabase Auth fails to delete the account, nothing is deleted (the database rolls back the cascade with
    /// the account): a 503 is returned and the user stays logged in, so it can try again.
    /// </summary>
    [Fact]
    public async Task DeleteAccount_AccountDeletionFails_Returns503AndKeepsSession()
    {
        _factory.AuthService.PasswordsByUserId["user-1"] = "secret";
        _factory.AuthService.DeleteUserFails = true;

        HttpResponseMessage response = await SendAsync(HttpMethod.Post, "/api/auth/delete-account", Token, new { password = "secret" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.False(DeletesCookie(response));
        Assert.Empty(_factory.AuthService.DeletedUserIds);
        Assert.Contains(Token, _factory.AuthService.UserIdsByToken);
    }

    /// <summary>
    /// A valid sign up creates the account, saves its profile with the birth year instead of the age, and opens the
    /// session of the new user.
    /// </summary>
    [Fact]
    public async Task Signup_Valid_CreatesAccountAndProfileAndOpensSession()
    {
        HttpResponseMessage response = await SignupAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string userId = Assert.Contains("new@test.fr", _factory.AuthService.UserIdsByEmail);
        Profile profile = Assert.Contains(userId, _factory.RatingService.Profiles);
        Assert.Equal("alex", profile.Username);
        Assert.Null(profile.DisplayName);
        Assert.Equal(DateTime.UtcNow.Year - 30, profile.BirthYear);
        Assert.Equal(Identities.NonBinary, profile.Identity);

        string? token = SessionCookie(response);
        Assert.NotNull(token);
        Assert.Equal(userId, _factory.AuthService.UserIdsByToken[token]);
    }

    /// <summary>
    /// The three identities and the age limits are accepted.
    /// </summary>
    [Theory]
    [InlineData("man", 0)]
    [InlineData("woman", 120)]
    [InlineData("non_binary", 18)]
    public async Task Signup_EveryIdentityAndAgeLimit_Returns200(string identity, int age)
    {
        HttpResponseMessage response = await SignupAsync(new() { ["identity"] = identity, ["age"] = age });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Profile profile = Assert.Single(_factory.RatingService.Profiles.Values);
        Assert.Equal(identity, profile.Identity);
        Assert.Equal(DateTime.UtcNow.Year - age, profile.BirthYear);
    }

    /// <summary>
    /// Signing up with the email of an existing account (whatever its case) is refused with a 409, without profile
    /// nor session.
    /// </summary>
    [Fact]
    public async Task Signup_EmailAlreadyRegistered_Returns409()
    {
        _factory.AuthService.UserIdsByEmail["new@test.fr"] = "existing-user";

        HttpResponseMessage response = await SignupAsync(new() { ["email"] = "New@Test.fr" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("An account with this email already exists.", await response.Content.ReadAsStringAsync());
        Assert.Empty(_factory.RatingService.Profiles);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// Signing up with the username of another user is refused with a 409 before the account is created, so the
    /// email can still be used once another username is chosen.
    /// </summary>
    [Fact]
    public async Task Signup_UsernameTaken_Returns409WithoutCreatingAccount()
    {
        _factory.RatingService.Profiles["other-user"] = new Profile { Id = "other-user", Username = "alex" };

        HttpResponseMessage response = await SignupAsync();

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("This username is already taken.", await response.Content.ReadAsStringAsync());
        Assert.Empty(_factory.AuthService.UserIdsByEmail);
        Assert.Null(SessionCookie(response));

        HttpResponseMessage retry = await SignupAsync(new() { ["username"] = "alex2" });
        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
    }

    /// <summary>
    /// When Supabase opens no session (email confirmation required), the sign up answers 401 without cookie.
    /// </summary>
    [Fact]
    public async Task Signup_NoSessionOpened_Returns401()
    {
        _factory.AuthService.OpensSessionOnSignUp = false;

        HttpResponseMessage response = await SignupAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// An unexpected exception is answered with a generic 500 in the usual <c>{ error }</c> shape, without the
    /// exception message nor its stack trace.
    /// </summary>
    [Fact]
    public async Task Signup_UnhandledException_Returns500WithoutDetails()
    {
        _factory.AuthService.SignUpException = new InvalidOperationException("secret database detail");

        HttpResponseMessage response = await SignupAsync();

        await AssertGenericErrorAsync(response);
        Assert.Empty(_factory.RatingService.Profiles);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// In development, the generic 500 replaces ASP.NET's error page, which would show the stack trace to the user.
    /// </summary>
    [Fact]
    public async Task Signup_UnhandledExceptionInDevelopment_Returns500WithoutDetails()
    {
        _factory.AuthService.SignUpException = new InvalidOperationException("secret database detail");
        using WebApplicationFactory<Program> development = _factory.WithWebHostBuilder(builder => builder.UseEnvironment("Development"));

        HttpResponseMessage response = await development.CreateClient().PostAsync("/api/auth/signup", JsonContent.Create(ValidSignup));

        await AssertGenericErrorAsync(response);
    }

    /// <summary>
    /// Checks <paramref name="response"/> is the generic 500 of <see cref="GlobalExceptionHandler"/>.
    /// </summary>
    private static async Task AssertGenericErrorAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(GlobalExceptionHandler.Message, JsonDocument.Parse(body).RootElement.GetProperty("error").GetString());
        Assert.DoesNotContain("secret database detail", body);
        Assert.DoesNotContain("InvalidOperationException", body);
    }

    /// <summary>
    /// A missing or malformed email is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task Signup_InvalidEmail_Returns400(string? email)
        => await AssertRefusedAsync(new() { ["email"] = email });

    /// <summary>
    /// A missing password, or one breaking the rules (8 characters, a letter, a number), is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("abcdef1")]
    [InlineData("abcdefgh")]
    [InlineData("12345678")]
    public async Task Signup_WeakPassword_Returns400(string? password)
        => await AssertRefusedAsync(new() { ["password"] = password });

    /// <summary>
    /// A missing, blank, too short, too long or space-padded username is refused with a 400, as is one holding capitals,
    /// spaces, accents or symbols other than "." and "_".
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ab")]
    [InlineData(" alex")]
    [InlineData("alex ")]
    [InlineData("abcdefghijklmnopqrstu")]
    [InlineData("Alex")]
    [InlineData("alex b")]
    [InlineData("élodie")]
    [InlineData("alex-b")]
    public async Task Signup_InvalidUsername_Returns400(string? username)
        => await AssertRefusedAsync(new() { ["username"] = username });

    /// <summary>
    /// A username of 3 to 20 lowercase letters, digits, dots and underscores is accepted.
    /// </summary>
    [Theory]
    [InlineData("abc")]
    [InlineData("alex.martin_92")]
    [InlineData("abcdefghijklmnopqrst")]
    public async Task Signup_ValidUsername_Returns200(string username)
    {
        HttpResponseMessage response = await SignupAsync(new() { ["username"] = username });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(username, Assert.Single(_factory.RatingService.Profiles.Values).Username);
    }

    /// <summary>
    /// A missing, negative, too high or decimal age is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData(-1)]
    [InlineData(121)]
    [InlineData(30.5)]
    public async Task Signup_InvalidAge_Returns400(object? age)
        => await AssertRefusedAsync(new() { ["age"] = age });

    /// <summary>
    /// A missing identity, or one that is not man, woman or non_binary, is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("other")]
    [InlineData("Man")]
    public async Task Signup_InvalidIdentity_Returns400(string? identity)
        => await AssertRefusedAsync(new() { ["identity"] = identity });

    /// <summary>
    /// Sends a password reset with the reset link "recovery-token" of "user-1", whose password is "old-pass1".
    /// </summary>
    private Task<HttpResponseMessage> ResetPasswordAsync(object body)
    {
        _factory.AuthService.UserIdsByRecoveryToken["recovery-token"] = "user-1";
        _factory.AuthService.PasswordsByUserId["user-1"] = "old-pass1";
        return _client.PostAsync("/api/auth/reset-password", JsonContent.Create(body));
    }

    /// <summary>
    /// A valid reset sets the new password and opens the session of the user.
    /// </summary>
    [Fact]
    public async Task ResetPassword_Valid_SetsPasswordAndOpensSession()
    {
        HttpResponseMessage response = await ResetPasswordAsync(new { accessToken = "recovery-token", refreshToken = "refresh", password = "abcdefg1" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("abcdefg1", _factory.AuthService.PasswordsByUserId["user-1"]);
        string? token = SessionCookie(response);
        Assert.NotNull(token);
        Assert.Equal("user-1", _factory.AuthService.UserIdsByToken[token]);
    }

    /// <summary>
    /// A missing password, or one breaking the sign up rules (8 characters, a letter, a number), is refused with a
    /// 400 before reaching Supabase: the password is kept and no session is opened.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("abcdef1")]
    [InlineData("abcdefgh")]
    [InlineData("12345678")]
    public async Task ResetPassword_WeakPassword_Returns400(string? password)
    {
        HttpResponseMessage response = await ResetPasswordAsync(new { accessToken = "recovery-token", refreshToken = "refresh", password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("old-pass1", _factory.AuthService.PasswordsByUserId["user-1"]);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// A reset without the tokens of the link is refused with a 400.
    /// </summary>
    [Fact]
    public async Task ResetPassword_MissingTokens_Returns400()
    {
        HttpResponseMessage response = await ResetPasswordAsync(new { password = "abcdefg1" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("old-pass1", _factory.AuthService.PasswordsByUserId["user-1"]);
    }

    /// <summary>
    /// An invalid or expired link is refused with a 401, without session.
    /// </summary>
    [Fact]
    public async Task ResetPassword_ExpiredLink_Returns401()
    {
        HttpResponseMessage response = await ResetPasswordAsync(new { accessToken = "expired", refreshToken = "refresh", password = "abcdefg1" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("The reset link is invalid or has expired.", await response.Content.ReadAsStringAsync());
        Assert.Equal("old-pass1", _factory.AuthService.PasswordsByUserId["user-1"]);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// A password following the rules but refused by Supabase (here the current password) is a 400 with the reason,
    /// not a 500.
    /// </summary>
    [Fact]
    public async Task ResetPassword_PasswordRefusedBySupabase_Returns400WithReason()
    {
        _factory.AuthService.ResetPasswordError = SupabaseAuthService.SamePassword;

        HttpResponseMessage response = await ResetPasswordAsync(new { accessToken = "recovery-token", refreshToken = "refresh", password = "old-pass1" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(SupabaseAuthService.SamePassword.Message, await response.Content.ReadAsStringAsync());
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// When Supabase Auth fails, the reset answers 503 (not 500) and the password is kept.
    /// </summary>
    [Fact]
    public async Task ResetPassword_SupabaseUnavailable_Returns503()
    {
        _factory.AuthService.ResetPasswordError = SupabaseAuthService.ResetPasswordUnavailable;

        HttpResponseMessage response = await ResetPasswordAsync(new { accessToken = "recovery-token", refreshToken = "refresh", password = "abcdefg1" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("old-pass1", _factory.AuthService.PasswordsByUserId["user-1"]);
        Assert.Null(SessionCookie(response));
    }

    /// <summary>
    /// Sends a sign up with <paramref name="changes"/>, and checks it is refused with a 400 without creating anything.
    /// </summary>
    private async Task AssertRefusedAsync(Dictionary<string, object?> changes)
    {
        HttpResponseMessage response = await SignupAsync(changes);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.AuthService.UserIdsByEmail);
        Assert.Empty(_factory.RatingService.Profiles);
        Assert.Null(SessionCookie(response));
    }
}
