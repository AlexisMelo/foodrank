using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a tierlist row and its restaurants to the API response.
/// </summary>
public class TierlistResponseTests
{
    /// <summary>
    /// Creation date of the tierlist mapped in every test.
    /// </summary>
    private static readonly DateTime CreatedAt = new(2026, 10, 1, 12, 30, 0, DateTimeKind.Utc);

    /// <summary>
    /// Builds the tierlist row mapped in the tests.
    /// </summary>
    private static Tierlist SampleTierlist() => new()
    {
        Id = 42,
        UserId = "user-1",
        Name = "Top 10",
        Description = null,
        Emoji = "🏆",
        Pinned = true,
        CreatedAt = CreatedAt
    };

    /// <summary>
    /// Every field of the row is copied, a null description included; without restaurants, the tierlist was last
    /// updated when it was created.
    /// </summary>
    [Fact]
    public void From_TierlistWithoutRestaurants_CopiesEveryField()
    {
        TierlistResponse response = TierlistResponse.From(SampleTierlist(), []);

        Assert.Equal(42, response.Id);
        Assert.Equal("user-1", response.UserId);
        Assert.Equal("Top 10", response.Name);
        Assert.Null(response.Description);
        Assert.Equal("🏆", response.Emoji);
        Assert.True(response.Pinned);
        Assert.Equal(CreatedAt, response.CreatedAt);
        Assert.Equal(CreatedAt, response.UpdatedAt);
        Assert.Empty(response.Restaurants);
    }

    /// <summary>
    /// The restaurants are listed oldest added first, and the tierlist was last updated when the latest one was added.
    /// </summary>
    [Fact]
    public void From_WithRestaurants_SortsThemAndUsesLatestAdditionAsUpdate()
    {
        DateTime latest = CreatedAt.AddDays(10);
        TierlistRestaurant[] restaurants =
        [
            new() { TierlistId = 42, RestaurantId = "r2", AddedAt = latest },
            new() { TierlistId = 42, RestaurantId = "r1", AddedAt = CreatedAt.AddDays(2) }
        ];

        TierlistResponse response = TierlistResponse.From(SampleTierlist(), restaurants);

        Assert.Equal(["r1", "r2"], response.Restaurants.Select(r => r.RestaurantId));
        Assert.Equal(latest, response.UpdatedAt);
    }

    /// <summary>
    /// Restaurants without addition date do not change the update date.
    /// </summary>
    [Fact]
    public void From_RestaurantWithoutDate_KeepsCreationAsUpdate()
    {
        TierlistResponse response = TierlistResponse.From(SampleTierlist(), [new TierlistRestaurant { TierlistId = 42, RestaurantId = "r1" }]);

        Assert.Equal(CreatedAt, response.UpdatedAt);
        Assert.Null(Assert.Single(response.Restaurants).AddedAt);
    }

    /// <summary>
    /// The nullable columns of a row not created by the API are returned as empty strings, and as not pinned.
    /// </summary>
    [Fact]
    public void From_NullColumns_ReturnsDefaults()
    {
        Tierlist tierlist = new() { Id = 1, CreatedAt = CreatedAt };

        TierlistResponse response = TierlistResponse.From(tierlist, []);

        Assert.Equal(string.Empty, response.UserId);
        Assert.Equal(string.Empty, response.Name);
        Assert.Equal(string.Empty, response.Emoji);
        Assert.False(response.Pinned);
    }
}
