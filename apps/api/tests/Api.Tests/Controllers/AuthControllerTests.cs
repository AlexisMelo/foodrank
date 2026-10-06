using System.Net;
using api.Common;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the session endpoints of /api/auth through HTTP, and with them the cookie authentication of every endpoint.
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
    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? token)
    {
        HttpRequestMessage request = new(method, url);
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// Returns true when the response tells the browser to delete the auth cookie.
    /// </summary>
    private static bool DeletesCookie(HttpResponseMessage response)
        => response.Headers.TryGetValues("Set-Cookie", out IEnumerable<string>? cookies)
            && cookies.Any(cookie => cookie.StartsWith($"{SupabaseAuthenticationHandler.CookieName}=;") && cookie.Contains("expires=Thu, 01 Jan 1970"));

    /// <summary>
    /// A valid cookie is accepted and kept.
    /// </summary>
    [Fact]
    public async Task Me_ValidCookie_Returns200()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Get, "/api/auth/me", Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(DeletesCookie(response));
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
}
