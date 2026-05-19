using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Handles authentication using Supabase magic links.
///
/// Flow:
///   1. POST /api/auth/login    — frontend sends an email; this controller asks Supabase
///                                to send a magic link. The link redirects to the frontend
///                                callback page, not to this server.
///
///   2. Frontend /auth/callback — Vue reads the access token from the URL hash fragment
///                                (hash fragments are browser-only; the server never sees them)
///                                and calls POST /api/auth/session with that token.
///
///   3. POST /api/auth/session  — validates the access token with Supabase and, if valid,
///                                sets an HttpOnly cookie. This is the only moment the token
///                                crosses from the browser to the server.
///
///   4. GET  /api/auth/me       — frontend calls this on startup to check whether a valid
///                                session cookie exists. Returns 200 or 401.
///
///   5. POST /api/auth/logout   — clears the session cookie.
///
/// The Supabase service role key is only used server-side and never sent to the browser.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(ISupabaseAuthService authService, IConfiguration configuration) : ControllerBase
{
    private const string CookieName = "foodrank_token";

    private string FrontendUrl => configuration["Frontend:Url"]!;

    /// <summary>
    /// Sends a magic link to the given email. The link redirects to the frontend
    /// callback page which then calls /api/auth/session to complete the flow.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string callbackUrl = $"{FrontendUrl}/auth/callback";
        await authService.SendMagicLinkAsync(request.Email, callbackUrl);
        return Ok();
    }

    /// <summary>
    /// Validates the access token sent by the frontend callback page and sets
    /// an HttpOnly session cookie on success.
    /// </summary>
    [HttpPost("session")]
    public async Task<IActionResult> Session([FromBody] SessionRequest request)
    {
        bool isValid = await authService.ValidateAccessTokenAsync(request.AccessToken);

        if (!isValid)
            return Unauthorized();

        Response.Cookies.Append(CookieName, request.AccessToken, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase),
            Expires = DateTimeOffset.UtcNow.AddHours(1),
            Path = "/"
        });

        return Ok();
    }

    /// <summary>
    /// Validates the session cookie against Supabase.
    /// Returns 200 if the session is valid, 401 otherwise.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!Request.Cookies.TryGetValue(CookieName, out string? token))
            return Unauthorized();

        bool isValid = await authService.ValidateAccessTokenAsync(token);

        if (!isValid)
        {
            Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
            return Unauthorized();
        }

        return Ok();
    }

    /// <summary>Clears the session cookie.</summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
        return Ok();
    }
}
