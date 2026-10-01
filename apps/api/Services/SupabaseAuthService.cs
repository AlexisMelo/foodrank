using Supabase.Gotrue;

namespace api.Services;

/// <summary>
/// Handles user authentication through Supabase Auth (GoTrue), with a per-request client so sessions never leak between requests.
/// </summary>
/// <param name="auth">GoTrue client scoped to the current request.</param>
public class SupabaseAuthService(Supabase.Gotrue.Client auth) : ISupabaseAuthService
{
    public async Task<string?> SignUpAsync(string email, string password)
    {
        Session? session = await auth.SignUp(email, password);
        return session?.AccessToken;
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
        Session? session = await auth.SignIn(email, password);
        return session?.AccessToken;
    }

    public async Task<bool> ValidateAccessTokenAsync(string accessToken)
    {
        User? user = await auth.GetUser(accessToken);
        return user is not null;
    }

    public async Task SendPasswordResetEmailAsync(string email, string redirectUrl)
    {
        await auth.ResetPasswordForEmail(new ResetPasswordForEmailOptions(email)
        {
            RedirectTo = redirectUrl
        });
    }

    public async Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword)
    {
        Session? session = await auth.SetSession(accessToken, refreshToken);
        if (session?.User == null)
            return null;

        await auth.Update(new UserAttributes { Password = newPassword });
        return session.AccessToken;
    }
}
