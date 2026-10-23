using api.Common;
using api.Models;
using api.Services;
using api.Services.Places;
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
    /// A place with coordinates becomes a restaurant at the same position, linked to the place.
    /// </summary>
    [Fact]
    public void ToRestaurant_WithCoordinates_MapsThePlace()
    {
        Result<Restaurant> restaurant = RestaurantService.ToRestaurant(new PlaceDetails("N42", "Novità", "1 rue Écuyère, Caen", 49.18, -0.37));

        Assert.True(restaurant.IsSuccess);
        Assert.Equal("N42", restaurant.Value!.OsmId);
        Assert.Equal("Novità", restaurant.Value.Name);
        Assert.Equal("1 rue Écuyère, Caen", restaurant.Value.Address);
        Assert.Equal(49.18, restaurant.Value.Lat);
        Assert.Equal(-0.37, restaurant.Value.Lng);
    }

    /// <summary>
    /// A place the provider gave without a full position is not saved: the coordinates of a restaurant are required.
    /// </summary>
    [Theory]
    [InlineData(null, null)]
    [InlineData(49.18, null)]
    [InlineData(null, -0.37)]
    public void ToRestaurant_WithoutCoordinates_Fails(double? lat, double? lng)
    {
        Result<Restaurant> restaurant = RestaurantService.ToRestaurant(new PlaceDetails("N42", "Novità", "", lat, lng));

        Assert.False(restaurant.IsSuccess);
        Assert.Equal(ErrorType.Unavailable, restaurant.Error!.Type);
    }
}
