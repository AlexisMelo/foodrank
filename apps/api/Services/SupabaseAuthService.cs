using Supabase.Gotrue;

namespace api.Services;

public class SupabaseAuthService(Supabase.Client supabase) : ISupabaseAuthService
{
    public async Task<string?> SignUpAsync(string email, string password)
    {
        Session? session = await supabase.Auth.SignUp(email, password);
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
        Session? session = await supabase.Auth.SignIn(email, password);
        return session?.AccessToken;
    }

    public async Task<bool> ValidateAccessTokenAsync(string accessToken)
    {
        User? user = await supabase.Auth.GetUser(accessToken);
        return user is not null;
    }

    public async Task SendPasswordResetEmailAsync(string email, string redirectUrl)
    {
        await supabase.Auth.ResetPasswordForEmail(new ResetPasswordForEmailOptions(email)
        {
            RedirectTo = redirectUrl
        });
    }

    public async Task<string?> ResetPasswordAsync(string accessToken, string refreshToken, string newPassword)
    {
        Session? session = await supabase.Auth.SetSession(accessToken, refreshToken);
        if (session?.User == null)
            return null;

        await supabase.Auth.Update(new UserAttributes { Password = newPassword });
        return session.AccessToken;
    }
}
