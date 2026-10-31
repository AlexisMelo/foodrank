using api.Models;
using api.Services;
using Supabase.Postgrest.Interfaces;

namespace Api.Tests.Services;

/// <summary>
/// Tests the queries <see cref="RestaurantService"/> sends to Supabase, by generating their URL without sending them.
/// </summary>
public class RestaurantServiceTests
{
    /// <summary>
    /// Empty query on the "restaurants" table of a Supabase that is never called.
    /// </summary>
    private static IPostgrestTable<Restaurant> RestaurantTable() => new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<Restaurant>();

    /// <summary>
    /// The query of the suggestions leaves out the restaurants the user rated.
    /// </summary>
    [Fact]
    public void UnratedRestaurantsQuery_LeavesOutRatedRestaurants()
    {
        string url = Uri.UnescapeDataString(RestaurantService.UnratedRestaurantsQuery(RestaurantTable(), ["r1", "r2"]).GenerateUrl());

        Assert.Contains("id=not.in.(\"r1\",\"r2\")", url);
    }

    /// <summary>
    /// A user who rated nothing gets every restaurant: no filter, as PostgREST rejects an empty "not in" list.
    /// </summary>
    [Fact]
    public void UnratedRestaurantsQuery_NothingRated_KeepsEveryRestaurant()
    {
        string url = Uri.UnescapeDataString(RestaurantService.UnratedRestaurantsQuery(RestaurantTable(), []).GenerateUrl());

        Assert.DoesNotContain("id=", url);
    }

    /// <summary>
    /// The ratings read for the suggestions are those of the suggested restaurants only, active or not.
    /// </summary>
    [Fact]
    public void RestaurantsRatingsQuery_ReadsTheRatingsOfTheGivenRestaurants()
    {
        IPostgrestTable<Rating> ratings = new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<Rating>();

        string url = Uri.UnescapeDataString(RestaurantService.RestaurantsRatingsQuery(ratings, ["r1", "r2"]).GenerateUrl());

        Assert.Contains("id_restaurant=in.(\"r1\",\"r2\")", url);
        Assert.DoesNotContain("is_active", url);
    }
}
