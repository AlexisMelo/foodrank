using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ISupabaseAuthService authService) : ControllerBase
{
    private const string CookieName = "foodrank_token";

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        string? token = await authService.SignUpAsync(request.Email, request.Password);

        if (token is null)
            return Unauthorized();

        SetSessionCookie(token);
        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string? token = await authService.SignInAsync(request.Email, request.Password);

        if (token is null)
            return Unauthorized();

        SetSessionCookie(token);
        return Ok();
    }

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

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
        return Ok();
    }

    /// <summary>
    /// Sets the session cookie with appropriate security settings.
    /// </summary>
    /// <param name="token"></param>
    private void SetSessionCookie(string token)
    {
        Response.Cookies.Append(CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase),
            Expires = DateTimeOffset.UtcNow.AddHours(24),
            Path = "/"
        });
    }
}
