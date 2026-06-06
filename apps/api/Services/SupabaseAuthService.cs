using Supabase.Gotrue;

namespace api.Services;

public class SupabaseAuthService(Supabase.Client supabase) : ISupabaseAuthService
{
    public async Task<string?> SignUpAsync(string email, string password)
    {
        Session? session = await supabase.Auth.SignUp(email, password);
        return session?.AccessToken;
    }

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
}
