using api.Models;
using api.Services;
using Supabase.Postgrest.Interfaces;

namespace Api.Tests.Services;

/// <summary>
/// Tests the queries <see cref="RatingService"/> sends to Supabase, by generating their URL without sending them.
/// </summary>
public class RatingServiceTests
{
    /// <summary>
    /// Empty query on the "rating" table of a Supabase that is never called.
    /// </summary>
    private static IPostgrestTable<Rating> RatingTable() => new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<Rating>();

    /// <summary>
    /// The query of a user's active rating of a restaurant can be built (it is sent when rating), and filters on the
    /// restaurant, the user and the active flag.
    /// </summary>
    [Fact]
    public void ActiveRatingsQuery_FiltersOnRestaurantUserAndActiveFlag()
    {
        string url = Uri.UnescapeDataString(RatingService.ActiveRatingsQuery(RatingTable(), "r1", "user-1").GenerateUrl());

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("id_user=eq.user-1", url);
        Assert.Contains("is_active=eq.true", url, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// The query of the "Recent" tab can be built, and keeps the restaurant's active ratings, most recent first.
    /// </summary>
    [Fact]
    public void RecentActiveRatingsQuery_FiltersOnRestaurantAndActiveFlag()
    {
        string url = Uri.UnescapeDataString(RatingService.RecentActiveRatingsQuery(RatingTable(), "r1", 5).GenerateUrl());

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("is_active=eq.true", url, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("order=date.desc", url);
        Assert.Contains("limit=5", url);
    }

    /// <summary>
    /// The query of the restaurant's averages can be built, and keeps every active rating of the restaurant (no limit).
    /// </summary>
    [Fact]
    public void RestaurantActiveRatingsQuery_FiltersOnRestaurantAndActiveFlag()
    {
        string url = Uri.UnescapeDataString(RatingService.RestaurantActiveRatingsQuery(RatingTable(), "r1").GenerateUrl());

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("is_active=eq.true", url, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("limit=", url);
    }
}
