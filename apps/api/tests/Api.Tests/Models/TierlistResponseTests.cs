using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a tierlist row to the API response.
/// </summary>
public class TierlistResponseTests
{
    /// <summary>
    /// Every field of the row is copied, a null description included.
    /// </summary>
    [Fact]
    public void From_Tierlist_CopiesEveryField()
    {
        DateTime createdAt = new(2026, 10, 10, 12, 30, 0, DateTimeKind.Utc);
        Tierlist tierlist = new()
        {
            Id = 42,
            UserId = "user-1",
            Name = "Top 10",
            Description = null,
            Emoji = "🏆",
            Pinned = true,
            CreatedAt = createdAt
        };

        TierlistResponse response = TierlistResponse.From(tierlist);

        Assert.Equal(42, response.Id);
        Assert.Equal("user-1", response.UserId);
        Assert.Equal("Top 10", response.Name);
        Assert.Null(response.Description);
        Assert.Equal("🏆", response.Emoji);
        Assert.True(response.Pinned);
        Assert.Equal(createdAt, response.CreatedAt);
    }
}
