using api.Services.Places;

namespace api.Models;

/// <summary>
/// A restaurant suggested to the logged-in user on the Explore page, returned by GET /api/restaurants/suggestions.
/// </summary>
/// <param name="Restaurant">The suggested restaurant, which the user has not rated yet.</param>
/// <param name="DistanceKm">Distance from the user's position in kilometers; null when the user's position is unknown.</param>
public record RestaurantSuggestionResponse(Restaurant Restaurant, double? DistanceKm)
{
    /// <summary>
    /// Picks the suggestions among <paramref name="unrated"/>: nearest to <paramref name="origin"/> first, keeping their
    /// given order when tied.
    /// </summary>
    /// <param name="unrated">Restaurants the user has not rated.</param>
    /// <param name="origin">Position the restaurants are sorted from: the user's, or the default city.</param>
    /// <param name="isUserPosition">True when <paramref name="origin"/> is the user's position. When false (default
    /// city), the restaurants are still sorted from it but no distance is returned, as it would not be the user's.</param>
    /// <param name="limit">Maximum number of suggestions.</param>
    /// <returns>At most <paramref name="limit"/> suggestions, nearest first.</returns>
    public static IReadOnlyList<RestaurantSuggestionResponse> Rank(IEnumerable<Restaurant> unrated, GeoPoint origin, bool isUserPosition, int limit)
        => unrated
            .Select(r => (Restaurant: r, DistanceKm: PlaceRanking.DistanceKm(origin, r.Lat, r.Lng)))
            .OrderBy(s => s.DistanceKm)
            .Take(limit)
            .Select(s => new RestaurantSuggestionResponse(s.Restaurant, isUserPosition ? s.DistanceKm : null))
            .ToList();
}
