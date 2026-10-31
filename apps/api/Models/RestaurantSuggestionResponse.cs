using api.Services.Places;

namespace api.Models;

/// <summary>
/// A restaurant suggested to the logged-in user on the Explore page, returned by GET /api/restaurants/suggestions.
/// </summary>
/// <param name="Restaurant">The suggested restaurant, which the user has not rated yet.</param>
/// <param name="DistanceKm">Distance from the user's position in kilometers; null when the user's position is unknown.</param>
/// <param name="GlobalScore">Average of every criterion of the restaurant's active ratings, from 1 to 10 (see
/// <see cref="RatingSummaryResponse.Global"/>); null when nobody rated it.</param>
/// <param name="FollowedRaters">Users the logged-in user follows who rated the restaurant, the most recent rating first,
/// each listed once; empty when none did.</param>
public record RestaurantSuggestionResponse(
    Restaurant Restaurant,
    double? DistanceKm,
    float? GlobalScore,
    IReadOnlyList<UserSummaryResponse> FollowedRaters)
{
    /// <summary>
    /// Picks the suggestions among <paramref name="unrated"/>: nearest to <paramref name="origin"/> first, keeping their
    /// given order when tied. Their ratings are added afterwards by <see cref="WithRatings"/>, only for the restaurants
    /// kept.
    /// </summary>
    /// <param name="unrated">Restaurants the user has not rated.</param>
    /// <param name="origin">Position the restaurants are sorted from: the user's, or the default city.</param>
    /// <param name="isUserPosition">True when <paramref name="origin"/> is the user's position. When false (default
    /// city), the restaurants are still sorted from it but no distance is returned, as it would not be the user's.</param>
    /// <param name="limit">Maximum number of suggestions.</param>
    /// <returns>At most <paramref name="limit"/> suggestions, nearest first, without global score nor followed raters.</returns>
    public static IReadOnlyList<RestaurantSuggestionResponse> Rank(IEnumerable<Restaurant> unrated, GeoPoint origin, bool isUserPosition, int limit)
        => unrated
            .Select(r => (Restaurant: r, DistanceKm: PlaceRanking.DistanceKm(origin, r.Lat, r.Lng)))
            .OrderBy(s => s.DistanceKm)
            .Take(limit)
            .Select(s => new RestaurantSuggestionResponse(s.Restaurant, isUserPosition ? s.DistanceKm : null, null, []))
            .ToList();

    /// <summary>
    /// Adds to each of <paramref name="suggestions"/> its global score and the users followed who rated it.
    /// </summary>
    /// <param name="suggestions">Suggestions picked by <see cref="Rank"/>, kept in their order.</param>
    /// <param name="ratings">Ratings of the suggested restaurants, active or not, by any user.</param>
    /// <param name="followedIds">Supabase Auth ids of the users the logged-in user follows.</param>
    /// <param name="profilesById">Profiles of the followed users among the authors of <paramref name="ratings"/>, by
    /// user id; a rater without profile is left out.</param>
    /// <returns>The suggestions with their global score and followed raters.</returns>
    public static IReadOnlyList<RestaurantSuggestionResponse> WithRatings(
        IReadOnlyList<RestaurantSuggestionResponse> suggestions,
        IEnumerable<Rating> ratings,
        IReadOnlySet<string> followedIds,
        IReadOnlyDictionary<string, Profile> profilesById)
    {
        ILookup<string, Rating> ratingsByRestaurant = ratings.ToLookup(r => r.RestaurantId);
        return suggestions
            .Select(s =>
            {
                List<Rating> restaurantRatings = ratingsByRestaurant[s.Restaurant.Id].ToList();
                List<UserSummaryResponse> followedRaters = restaurantRatings
                    .Where(r => followedIds.Contains(r.UserId) && profilesById.ContainsKey(r.UserId))
                    .OrderByDescending(r => r.Date)
                    .Select(r => r.UserId)
                    .Distinct()
                    .Select(id => UserSummaryResponse.From(profilesById[id]))
                    .ToList();
                return s with
                {
                    GlobalScore = RatingSummaryResponse.From(restaurantRatings).Global,
                    FollowedRaters = followedRaters
                };
            })
            .ToList();
    }
}
