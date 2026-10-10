using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the rules of a tierlist row.
/// </summary>
public class TierlistTests
{
    /// <summary>
    /// Only the user who created the tierlist owns it; a row without user is owned by nobody.
    /// </summary>
    [Theory]
    [InlineData("11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111", true)]
    [InlineData("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", false)]
    [InlineData(null, "11111111-1111-1111-1111-111111111111", false)]
    public void IsOwnedBy_ComparesWithCreator(string? creator, string userId, bool expected)
    {
        Tierlist tierlist = new() { UserId = creator };

        Assert.Equal(expected, tierlist.IsOwnedBy(userId));
    }
}
