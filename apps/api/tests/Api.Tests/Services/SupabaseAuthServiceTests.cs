using System.Net;
using System.Net.Sockets;
using System.Text;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Services;

/// <summary>
/// Tests how <see cref="SupabaseAuthService"/> maps the Supabase Auth failures, against a local HTTP server answering
/// like Supabase Auth.
/// </summary>
public class SupabaseAuthServiceTests : IDisposable
{
    /// <summary>
    /// Local server standing for Supabase Auth.
    /// </summary>
    private readonly HttpListener _server = new();

    /// <summary>
    /// Base URL of <see cref="_server"/>.
    /// </summary>
    private readonly string _url;

    /// <summary>
    /// Starts the server on a free port.
    /// </summary>
    public SupabaseAuthServiceTests()
    {
        TcpListener portFinder = new(IPAddress.Loopback, 0);
        portFinder.Start();
        int port = ((IPEndPoint)portFinder.LocalEndpoint).Port;
        portFinder.Stop();

        _url = $"http://localhost:{port}";
        _server.Prefixes.Add($"{_url}/");
        _server.Start();
    }

    /// <summary>
    /// Stops the server.
    /// </summary>
    public void Dispose() => _server.Close();

    /// <summary>
    /// Body of the last request answered by <see cref="RespondAsync"/>, empty when it had none.
    /// </summary>
    private string _lastRequestBody = string.Empty;

    /// <summary>
    /// Answers the next request with <paramref name="statusCode"/> and the JSON <paramref name="body"/>.
    /// </summary>
    /// <returns>The method and path of the request answered, e.g. "DELETE /admin/users/user-1".</returns>
    private async Task<string> RespondAsync(int statusCode, string body)
    {
        HttpListenerContext context = await _server.GetContextAsync();
        string request = $"{context.Request.HttpMethod} {context.Request.Url!.AbsolutePath}";
        using (StreamReader reader = new(context.Request.InputStream))
            _lastRequestBody = await reader.ReadToEndAsync();
        byte[] content = Encoding.UTF8.GetBytes(body);
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.OutputStream.WriteAsync(content);
        context.Response.Close();
        return request;
    }

    /// <summary>
    /// Creates the service, calling <see cref="_server"/> as Supabase Auth.
    /// </summary>
    private SupabaseAuthService CreateService() => new(
        new Supabase.Gotrue.Client(new Supabase.Gotrue.ClientOptions { Url = _url, AutoRefreshToken = false }),
        new Supabase.Gotrue.AdminClient("service-key", new Supabase.Gotrue.ClientOptions { Url = _url }),
        NullLogger<SupabaseAuthService>.Instance);

    /// <summary>
    /// Supabase Auth's answer to the admin lookup of the user "user-1".
    /// </summary>
    private const string User1 = """{"id":"user-1","email":"me@test.fr"}""";

    /// <summary>
    /// The service refuses a missing dependency instead of failing on its first use.
    /// </summary>
    [Fact]
    public void Constructor_NullDependency_Throws()
    {
        Supabase.Gotrue.Client auth = new(new Supabase.Gotrue.ClientOptions { Url = _url });
        Supabase.Gotrue.AdminClient admin = new("service-key", new Supabase.Gotrue.ClientOptions { Url = _url });

        Assert.Equal("auth", Assert.Throws<ArgumentNullException>(
            () => new SupabaseAuthService(null!, admin, NullLogger<SupabaseAuthService>.Instance)).ParamName);
        Assert.Equal("admin", Assert.Throws<ArgumentNullException>(
            () => new SupabaseAuthService(auth, null!, NullLogger<SupabaseAuthService>.Instance)).ParamName);
        Assert.Equal("logger", Assert.Throws<ArgumentNullException>(
            () => new SupabaseAuthService(auth, admin, null!)).ParamName);
    }

    /// <summary>
    /// A server-side failure of Supabase Auth (here a database trigger failing) becomes a 503 result with a generic
    /// message instead of an exception.
    /// </summary>
    [Fact]
    public async Task SignUp_DatabaseError_ReturnsUnavailable()
    {
        Task response = RespondAsync(500,
            """{"code":500,"error_code":"unexpected_failure","msg":"Database error saving new user","error_id":"01a13481"}""");

        Result<AuthSession> result = await CreateService().SignUpAsync("new@test.fr", "abcdefg1");
        await response;

        Assert.Equal(SupabaseAuthService.SignUpUnavailable, result.Error);
        Assert.Equal(ErrorType.Unavailable, result.Error!.Type);
    }

    /// <summary>
    /// The password is checked by signing in with the email of the account, read with the admin client.
    /// </summary>
    [Fact]
    public async Task CheckPassword_RightPassword_Succeeds()
    {
        Task<string[]> server = Task.Run(async () => new[]
        {
            await RespondAsync(200, User1),
            await RespondAsync(200, """{"access_token":"token","token_type":"bearer","expires_in":3600,"refresh_token":"refresh","user":{"id":"user-1","email":"me@test.fr","confirmed_at":"2026-01-01T00:00:00Z"}}""")
        });

        Result<bool> result = await CreateService().CheckPasswordAsync("user-1", "secret");
        string[] requests = await server;

        Assert.True(result.IsSuccess);
        Assert.Equal(["GET /admin/users/user-1", "POST /token"], requests);
    }

    /// <summary>
    /// Supabase Auth refusing the credentials means the password is wrong: a Forbidden result, not an exception.
    /// </summary>
    [Fact]
    public async Task CheckPassword_WrongPassword_ReturnsWrongPassword()
    {
        Task server = Task.Run(async () =>
        {
            await RespondAsync(200, User1);
            await RespondAsync(400, """{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}""");
        });

        Result<bool> result = await CreateService().CheckPasswordAsync("user-1", "wrong");
        await server;

        Assert.Equal(SupabaseAuthService.WrongPassword, result.Error);
        Assert.Equal(ErrorType.Forbidden, result.Error!.Type);
    }

    /// <summary>
    /// A failure of Supabase Auth while reading the account becomes a 503 result instead of an exception.
    /// </summary>
    [Fact]
    public async Task CheckPassword_SupabaseError_ReturnsUnavailable()
    {
        Task response = RespondAsync(500, """{"code":500,"error_code":"unexpected_failure","msg":"Database error"}""");

        Result<bool> result = await CreateService().CheckPasswordAsync("user-1", "secret");
        await response;

        Assert.Equal(SupabaseAuthService.DeleteAccountUnavailable, result.Error);
    }

    /// <summary>
    /// The account is deleted through the admin API, as a hard delete: a soft delete would keep the auth.users row,
    /// and the database would not cascade the deletion to the user's profile, ratings and tierlists.
    /// </summary>
    [Fact]
    public async Task DeleteUser_Deleted_SucceedsWithHardDelete()
    {
        Task<string> response = RespondAsync(200, "{}");

        Result<bool> result = await CreateService().DeleteUserAsync("user-1");

        Assert.True(result.IsSuccess);
        Assert.Equal("DELETE /admin/users/user-1", await response);
        Assert.DoesNotContain("should_soft_delete\":true", _lastRequestBody.Replace(" ", ""));
    }

    /// <summary>
    /// Access token of a reset password link of "user-1", valid for an hour: an unsigned JWT is enough, the client only
    /// reads its expiry to choose between checking it and refreshing it.
    /// </summary>
    private static string RecoveryToken()
    {
        static string Encode(string json) => Convert.ToBase64String(Encoding.UTF8.GetBytes(json)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        long expiry = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds();
        return $"{Encode("""{"alg":"HS256","typ":"JWT"}""")}.{Encode($$"""{"sub":"user-1","exp":{{expiry}}}""")}.signature";
    }

    /// <summary>
    /// The session of the link is opened with its token, then the new password is set on its account.
    /// </summary>
    [Fact]
    public async Task ResetPassword_ValidLink_SetsPasswordAndReturnsToken()
    {
        string token = RecoveryToken();
        Task<string[]> server = Task.Run(async () => new[]
        {
            await RespondAsync(200, User1),
            await RespondAsync(200, User1)
        });

        Result<string> result = await CreateService().ResetPasswordAsync(token, "refresh", "abcdefg1");
        string[] requests = await server;

        Assert.Equal(token, result.Value);
        Assert.Equal(["GET /user", "PUT /user"], requests);
        Assert.Contains("\"password\":\"abcdefg1\"", _lastRequestBody.Replace(" ", ""));
    }

    /// <summary>
    /// A token Supabase Auth refuses (link already used or expired) is an Unauthorized result, not an exception.
    /// </summary>
    [Fact]
    public async Task ResetPassword_TokenRefused_ReturnsLinkExpired()
    {
        Task response = RespondAsync(403, """{"code":403,"error_code":"bad_jwt","msg":"invalid JWT: token is expired"}""");

        Result<string> result = await CreateService().ResetPasswordAsync(RecoveryToken(), "refresh", "abcdefg1");
        await response;

        Assert.Equal(SupabaseAuthService.ResetLinkExpired, result.Error);
        Assert.Equal(ErrorType.Unauthorized, result.Error!.Type);
    }

    /// <summary>
    /// An access token that is not a JWT (altered link) is an Unauthorized result, without calling Supabase Auth.
    /// </summary>
    [Fact]
    public async Task ResetPassword_MalformedToken_ReturnsLinkExpired()
    {
        Result<string> result = await CreateService().ResetPasswordAsync("not-a-jwt", "refresh", "abcdefg1");

        Assert.Equal(SupabaseAuthService.ResetLinkExpired, result.Error);
    }

    /// <summary>
    /// Supabase Auth refusing the current password as the new one is a Validation result telling why.
    /// </summary>
    [Fact]
    public async Task ResetPassword_SamePassword_ReturnsSamePassword()
    {
        Task server = Task.Run(async () =>
        {
            await RespondAsync(200, User1);
            await RespondAsync(422, """{"code":422,"error_code":"same_password","msg":"New password should be different from the old password."}""");
        });

        Result<string> result = await CreateService().ResetPasswordAsync(RecoveryToken(), "refresh", "abcdefg1");
        await server;

        Assert.Equal(SupabaseAuthService.SamePassword, result.Error);
        Assert.Equal(ErrorType.Validation, result.Error!.Type);
    }

    /// <summary>
    /// Supabase Auth refusing the password for its own policy is a Validation result.
    /// </summary>
    [Fact]
    public async Task ResetPassword_WeakPasswordForSupabase_ReturnsPasswordRefused()
    {
        Task server = Task.Run(async () =>
        {
            await RespondAsync(200, User1);
            await RespondAsync(422, """{"code":422,"error_code":"weak_password","msg":"Password should be at least 10 characters."}""");
        });

        Result<string> result = await CreateService().ResetPasswordAsync(RecoveryToken(), "refresh", "abcdefg1");
        await server;

        Assert.Equal(SupabaseAuthService.PasswordRefused, result.Error);
    }

    /// <summary>
    /// A failure of Supabase Auth while setting the password becomes a 503 result instead of an exception.
    /// </summary>
    [Fact]
    public async Task ResetPassword_SupabaseError_ReturnsUnavailable()
    {
        Task server = Task.Run(async () =>
        {
            await RespondAsync(200, User1);
            await RespondAsync(500, """{"code":500,"error_code":"unexpected_failure","msg":"Database error updating user"}""");
        });

        Result<string> result = await CreateService().ResetPasswordAsync(RecoveryToken(), "refresh", "abcdefg1");
        await server;

        Assert.Equal(SupabaseAuthService.ResetPasswordUnavailable, result.Error);
    }

    /// <summary>
    /// A failure of Supabase Auth while deleting the account becomes a 503 result instead of an exception.
    /// </summary>
    [Fact]
    public async Task DeleteUser_SupabaseError_ReturnsUnavailable()
    {
        Task response = RespondAsync(500, """{"code":500,"error_code":"unexpected_failure","msg":"Database error deleting user"}""");

        Result<bool> result = await CreateService().DeleteUserAsync("user-1");
        await response;

        Assert.Equal(SupabaseAuthService.DeleteAccountUnavailable, result.Error);
    }
}
