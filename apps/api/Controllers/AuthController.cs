using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ISupabaseAuthService authService, IUserService userService, IConfiguration configuration) : ControllerBase
{
    private string FrontendUrl => configuration["Frontend:Url"]!;

    /// <summary>
    /// Creates the Supabase Auth account with its profile (pseudonym, birth year, identity), then opens its session.
    /// </summary>
    /// <param name="request">Email, password and personal data entered in the sign up steps.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the session cookie, 400 for invalid values, 401 when no session could be opened, 409 when
    /// the email or the pseudonym is already used.</returns>
    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request, CancellationToken cancellationToken)
    {
        // Checked before creating the account: an account whose profile cannot be saved would be left without
        // pseudonym, and its email could not be used to sign up again
        if (await userService.IsUsernameTakenAsync(request.Username, cancellationToken))
            return Conflict(new { error = UserService.UsernameTaken.Message });

        Result<AuthSession> session = await authService.SignUpAsync(request.Email, request.Password);
        if (!session.IsSuccess)
            return session.ToActionResult();

        Result<Profile> profile = await userService.SaveProfileAsync(
            request.ToProfile(session.Value!.UserId, DateTime.UtcNow.Year), cancellationToken);
        if (!profile.IsSuccess)
            return profile.ToActionResult();

        SetSessionCookie(session.Value.AccessToken);
        return Ok();
    }

    /// <summary>
    /// Allows a user to log in
    /// </summary>
    /// <param name="request">User credentials</param>
    /// <returns></returns>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string? token = await authService.SignInAsync(request.Email, request.Password);

        if (token is null)
            return Unauthorized();

        SetSessionCookie(token);
        return Ok();
    }

    /// <summary>
    /// Returns the logged-in user when the session cookie holds a valid token; otherwise the authentication handler
    /// answers 401 and deletes the cookie.
    /// </summary>
    /// <returns>200 with the id of the logged-in user, 401 when not logged in.</returns>
    [HttpGet("me")]
    public ActionResult<SessionUserResponse> Me() => Ok(new SessionUserResponse(User.GetUserId()));

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        DeleteCookie();
        return Ok();
    }

    /// <summary>
    /// Deletes the account of the logged-in user once its password is confirmed, and logs it out. Only the Supabase
    /// Auth account is deleted here: its profile, ratings and tierlists are deleted by the database in the same
    /// transaction (ON DELETE CASCADE foreign keys to auth.users), so the account is never deleted without them.
    /// </summary>
    /// <param name="request">Current password of the user.</param>
    /// <returns>200 and the session cookie deleted, 400 without password, 401 when not logged in, 403 when the
    /// password is wrong, 503 when Supabase Auth fails (nothing is deleted then).</returns>
    [HttpPost("delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        string userId = User.GetUserId();

        Result<bool> password = await authService.CheckPasswordAsync(userId, request.Password);
        if (!password.IsSuccess)
            return password.ToActionResult();

        Result<bool> deleted = await authService.DeleteUserAsync(userId);
        if (!deleted.IsSuccess)
            return deleted.ToActionResult();

        DeleteCookie();
        return Ok();
    }

    /// <summary>
    /// Delete logged in user Cookie
    /// </summary>
    private void DeleteCookie()
    {
        Response.Cookies.Delete(SupabaseAuthenticationHandler.CookieName, new CookieOptions { Path = "/" });
    }

    /// <summary>
    /// Sends a password reset email. Always returns 200 to prevent email enumeration.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
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
    [AllowAnonymous]
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
        Response.Cookies.Append(SupabaseAuthenticationHandler.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase),
            Expires = DateTimeOffset.UtcNow.AddHours(24),
            Path = "/"
        });
    }
}
