using api.Services;

namespace Api.Tests.Services;

/// <summary>
/// Tests the Supabase-backed <see cref="UserService"/> rules that need no database.
/// </summary>
public class UserServiceTests
{
    /// <summary>
    /// The service refuses a null Supabase client instead of failing on the first query.
    /// </summary>
    [Fact]
    public void Constructor_NullClient_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new UserService(null!));
    }
}
