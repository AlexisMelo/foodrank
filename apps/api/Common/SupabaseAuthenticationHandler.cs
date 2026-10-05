using System.Security.Claims;
using System.Text.Encodings.Web;
using api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace api.Common;

/// <summary>
/// Authenticates requests from the Supabase access token stored in the session cookie, so controllers only need
/// <c>[Authorize]</c> (the default for every endpoint, see Program.cs) and <see cref="ClaimsPrincipalExtensions.GetUserId"/>.
/// </summary>
/// <param name="options">Scheme options (none specific to this handler).</param>
/// <param name="logger">Logger factory required by the base handler.</param>
/// <param name="encoder">URL encoder required by the base handler.</param>
/// <param name="authService">Resolves the user owning the access token.</param>
public class SupabaseAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    ISupabaseAuthService authService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    /// <summary>
    /// Name of the authentication scheme registered in Program.cs.
    /// </summary>
    public const string SchemeName = "SupabaseCookie";

    /// <summary>
    /// Name of the cookie holding the Supabase access token, set on login/signup by the auth controller.
    /// </summary>
    public const string CookieName = "foodrank_token";

    /// <summary>
    /// Builds the user from the cookie: no result without cookie, failure when Supabase rejects the token
    /// (expired or forged), otherwise a user carrying its Supabase id as <see cref="ClaimTypes.NameIdentifier"/>.
    /// </summary>
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(CookieName, out string? token) || string.IsNullOrEmpty(token))
            return AuthenticateResult.NoResult();

        string? userId = await authService.GetUserIdAsync(token);
        if (userId is null)
            return AuthenticateResult.Fail("Invalid or expired access token.");

        ClaimsIdentity identity = new([new Claim(ClaimTypes.NameIdentifier, userId)], SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }

    /// <summary>
    /// Answers 401 and deletes the cookie when it holds an invalid token, so the browser stops sending it.
    /// </summary>
    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        if (Request.Cookies.ContainsKey(CookieName))
            Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/" });

        return base.HandleChallengeAsync(properties);
    }
}
