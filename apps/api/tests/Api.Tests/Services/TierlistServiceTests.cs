using api.Services;

namespace Api.Tests.Services;

/// <summary>
/// Tests the Supabase-backed <see cref="TierlistService"/> rules that need no database.
/// </summary>
public class TierlistServiceTests
{
    /// <summary>
    /// The service refuses a null Supabase client instead of failing on the first query.
    /// </summary>
    [Fact]
    public void Constructor_NullClient_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new TierlistService(null!));
    }
}
