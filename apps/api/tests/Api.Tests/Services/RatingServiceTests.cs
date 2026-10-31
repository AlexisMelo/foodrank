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
    /// The query of a user's latest rating can be built (it is sent to check the "one restaurant per day" rule), and
    /// keeps only the most recent rating of the user, whatever the restaurant and the active flag.
    /// </summary>
    [Fact]
    public void LatestRatingQuery_KeepsMostRecentRatingOfUser()
    {
        string url = Uri.UnescapeDataString(RatingService.LatestRatingQuery(RatingTable(), "user-1").GenerateUrl());

        Assert.Contains("id_user=eq.user-1", url);
        Assert.Contains("order=date.desc", url);
        Assert.Contains("limit=1", url);
        Assert.DoesNotContain("id_restaurant", url);
        Assert.DoesNotContain("is_active", url, StringComparison.OrdinalIgnoreCase);
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
    /// The query of a user's ratings of a restaurant (read, or sent to delete them all) filters on both the restaurant
    /// and the user, active or not, so the delete never removes other users' or restaurants' ratings.
    /// </summary>
    [Fact]
    public void UserRatingsQuery_FiltersOnRestaurantAndUser()
    {
        string url = Uri.UnescapeDataString(RatingService.UserRatingsQuery(RatingTable(), "r1", "user-1").GenerateUrl());

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("id_user=eq.user-1", url);
        Assert.DoesNotContain("is_active", url, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// The query of one rating (sent to delete it) filters on its whole primary key, the moment written in UTC with its
    /// microseconds and without a "+", which the URL would turn into a space.
    /// </summary>
    [Fact]
    public void RatingQuery_FiltersOnTheWholePrimaryKey()
    {
        DateTimeOffset date = new DateTimeOffset(2026, 3, 7, 21, 30, 0, TimeSpan.FromHours(2)).AddTicks(1_234_560);

        string rawUrl = RatingService.RatingQuery(RatingTable(), "r1", "user-1", date).GenerateUrl();
        string url = Uri.UnescapeDataString(rawUrl);

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("id_user=eq.user-1", url);
        Assert.Contains("date=eq.2026-03-07T19:30:00.123456Z", url);
        Assert.DoesNotContain("+", rawUrl);
    }

    /// <summary>
    /// The query of the "Followed" tab can be built, and keeps the restaurant's active ratings given by the users
    /// followed, most recent first.
    /// </summary>
    [Fact]
    public void UsersRecentActiveRatingsQuery_FiltersOnRestaurantUsersAndActiveFlag()
    {
        string url = Uri.UnescapeDataString(RatingService.UsersRecentActiveRatingsQuery(RatingTable(), "r1", ["user-1", "user-2"], 5).GenerateUrl());

        Assert.Contains("id_restaurant=eq.r1", url);
        Assert.Contains("id_user=in.(\"user-1\",\"user-2\")", url);
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

    /// <summary>
    /// The query of the ratings of the users followed can be built, and keeps the most recent ratings of any of them,
    /// active or not, whatever the restaurant.
    /// </summary>
    [Fact]
    public void UsersRecentRatingsQuery_KeepsMostRecentRatingsOfUsers()
    {
        string url = Uri.UnescapeDataString(RatingService.UsersRecentRatingsQuery(RatingTable(), ["user-1", "user-2"], 5).GenerateUrl());

        Assert.Contains("id_user=in.(\"user-1\",\"user-2\")", url);
        Assert.Contains("order=date.desc", url);
        Assert.Contains("limit=5", url);
        Assert.DoesNotContain("id_restaurant", url);
        Assert.DoesNotContain("is_active", url, StringComparison.OrdinalIgnoreCase);
    }
}
