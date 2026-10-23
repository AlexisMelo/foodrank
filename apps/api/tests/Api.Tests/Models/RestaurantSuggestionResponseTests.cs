using api.Models;
using api.Services.Places;

namespace Api.Tests.Models;

/// <summary>
/// Tests the choice and order of the restaurants suggested on the Explore page.
/// </summary>
public class RestaurantSuggestionResponseTests
{
    /// <summary>
    /// Position of the user in the tests: Caen.
    /// </summary>
    private static readonly GeoPoint Caen = new(49.18, -0.37);

    /// <summary>
    /// Builds the restaurant <paramref name="id"/> at (<paramref name="lat"/>, <paramref name="lng"/>).
    /// </summary>
    private static Restaurant At(string id, double? lat, double? lng) => new() { Id = id, Name = id, Lat = lat, Lng = lng };

    /// <summary>
    /// The nearest restaurant comes first, whatever the order they are read in.
    /// </summary>
    [Fact]
    public void Rank_SortsNearestFirst()
    {
        Restaurant[] restaurants = [At("paris", 48.85, 2.35), At("mid", 49.2, -0.37), At("near", 49.185, -0.37)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, Caen, isUserPosition: true, limit: 5);

        Assert.Equal(["near", "mid", "paris"], suggestions.Select(s => s.Restaurant.Id));
    }

    /// <summary>
    /// A restaurant with a missing coordinate cannot be measured: it comes after every measured one, without distance.
    /// </summary>
    [Fact]
    public void Rank_PutsRestaurantsWithoutCoordinatesLast()
    {
        Restaurant[] restaurants = [At("unknown", null, null), At("no-lng", 49.18, null), At("paris", 48.85, 2.35)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, Caen, isUserPosition: true, limit: 5);

        Assert.Equal(["paris", "unknown", "no-lng"], suggestions.Select(s => s.Restaurant.Id));
        Assert.Null(suggestions[1].DistanceKm);
        Assert.Null(suggestions[2].DistanceKm);
    }

    /// <summary>
    /// Only the <c>limit</c> nearest restaurants are suggested.
    /// </summary>
    [Fact]
    public void Rank_KeepsAtMostLimit()
    {
        Restaurant[] restaurants = [At("paris", 48.85, 2.35), At("mid", 49.2, -0.37), At("near", 49.185, -0.37)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, Caen, isUserPosition: true, limit: 2);

        Assert.Equal(["near", "mid"], suggestions.Select(s => s.Restaurant.Id));
    }

    /// <summary>
    /// From the user's position, each suggestion carries its distance in kilometers.
    /// </summary>
    [Fact]
    public void Rank_FromUserPosition_ReturnsDistances()
    {
        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank([At("near", 49.185, -0.37)], Caen, isUserPosition: true, limit: 5);

        Assert.Equal(0.556, suggestions[0].DistanceKm!.Value, precision: 3);
    }

    /// <summary>
    /// From the default city, the restaurants are still sorted from it, but no distance is returned: it would not be
    /// the user's.
    /// </summary>
    [Fact]
    public void Rank_FromDefaultCity_SortsFromItWithoutDistance()
    {
        GeoPoint paris = new(48.8566, 2.3522);
        Restaurant[] restaurants = [At("caen", 49.18, -0.37), At("paris", 48.85, 2.35)];

        IReadOnlyList<RestaurantSuggestionResponse> suggestions = RestaurantSuggestionResponse.Rank(restaurants, paris, isUserPosition: false, limit: 5);

        Assert.Equal(["paris", "caen"], suggestions.Select(s => s.Restaurant.Id));
        Assert.All(suggestions, s => Assert.Null(s.DistanceKm));
    }
}
