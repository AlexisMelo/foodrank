using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;
using Supabase.Gotrue.Exceptions;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ISupabaseAuthService authService, IConfiguration configuration) : ControllerBase
{
    private const string CookieName = "foodrank_token";

    private string FrontendUrl => configuration["Frontend:Url"]!;

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        try
        {
            string? token = await authService.SignUpAsync(request.Email, request.Password);

            if (token is null)
                return Unauthorized();

            SetSessionCookie(token);
            return Ok();
        }
        catch (GotrueException ex) when (ex.Reason == FailureHint.Reason.UserAlreadyRegistered)
        {
            return Conflict(new { error = "User already exists." });
        }
    }

    /// <summary>
    /// Allows a user to log in
    /// </summary>
    /// <param name="request">User credentials</param>
    /// <returns></returns>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string? token = await authService.SignInAsync(request.Email, request.Password);

        if (token is null)
            return Unauthorized();

        SetSessionCookie(token);
        return Ok();
    }

    /// <summary>
    /// 
    /// </summary>
    /// <returns></returns>
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!Request.Cookies.TryGetValue(CookieName, out string? token))
            return Unauthorized();

        bool isValid = await authService.ValidateAccessTokenAsync(token);

        if (!isValid)
        {
            DeleteCookie();
            return Unauthorized();
        }

        return Ok();
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        DeleteCookie();
        return Ok();
    }

    /// <summary>
    /// Delete logged in user Cookie
    /// </summary>
    private void DeleteCookie()
    {
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });
    }

    /// <summary>
    /// Sends a password reset email. Always returns 200 to prevent email enumeration.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        string redirectUrl = $"{FrontendUrl}/auth/reset-password";
        try
        {
            await authService.SendPasswordResetEmailAsync(request.Email, redirectUrl);
        }
        catch
        {
            // Swallow errors to prevent email enumeration
        }
        return Ok();
    }

    /// <summary>
    /// Validates the recovery token, updates the password, and opens a session.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        string? token = await authService.ResetPasswordAsync(request.AccessToken, request.RefreshToken, request.Password);

        if (token is null)
            return Unauthorized();

        SetSessionCookie(token);
        return Ok();
    }

    /// <summary>
    /// Set connection token to the request
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
