using Supabase.Gotrue;
using static Supabase.Gotrue.Constants;

namespace api.Services;

public class SupabaseAuthService(Supabase.Client supabase) : ISupabaseAuthService
{
    /// <summary>
    /// Send magic link to the given email. The link will redirect to the provided URL
    /// </summary>
    /// <param name="email"></param>
    /// <param name="redirectUrl"></param>
    /// <returns></returns>
    public async Task SendMagicLinkAsync(string email, string redirectUrl)
    {
        await supabase.Auth.SignInWithOtp(new SignInWithPasswordlessEmailOptions(email)
        {
            EmailRedirectTo = redirectUrl
        });
    }

    /// <summary>
    /// Verify the token hash received from the magic link callback. If valid, returns the access token; otherwise null.
    /// </summary>
    /// <param name="tokenHash"></param>
    /// <param name="type"></param>
    /// <returns></returns>
    public async Task<string?> VerifyTokenHashAsync(string tokenHash, string type)
    {
        if (!Enum.TryParse(type, ignoreCase: true, out EmailOtpType otpType))
            return null;

        Session? session = await supabase.Auth.VerifyTokenHash(tokenHash, otpType);
        return session?.AccessToken;
    }

    public async Task<bool> ValidateAccessTokenAsync(string accessToken)
    {
        User? user = await supabase.Auth.GetUser(accessToken);
        return user is not null;
    }
}
