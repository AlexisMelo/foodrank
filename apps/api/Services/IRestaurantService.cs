using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Reads restaurants from the database and creates them from places selected in the search.
/// </summary>
public interface IRestaurantService
{
    /// <summary>
    /// Returns every restaurant stored in the database.
    /// </summary>
    Task<IReadOnlyList<Restaurant>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurant with the database identifier <paramref name="id"/>, or a NotFound error.
    /// </summary>
    Task<Result<Restaurant>> GetByIdAsync(string id, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurant linked to <paramref name="placeId"/>, creating it from the place provider if it is not stored yet,
    /// and whether this call created it.
    /// </summary>
    Task<Result<RestaurantFromPlaceResponse>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurants <paramref name="userId"/> has not rated yet, nearest first, with their global score and
    /// the users <paramref name="userId"/> follows who rated them. Without a valid position, they are sorted from the
    /// default city and returned without distance.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user.</param>
    /// <param name="lat">Latitude of the user in degrees, null when unknown.</param>
    /// <param name="lon">Longitude of the user in degrees, null when unknown.</param>
    /// <param name="limit">Maximum number of suggestions.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>At most <paramref name="limit"/> suggestions, nearest first.</returns>
    Task<IReadOnlyList<RestaurantSuggestionResponse>> GetSuggestionsAsync(string userId, double? lat, double? lon, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurants the users <paramref name="userId"/> follows recommend: rated by one of them more than
    /// <see cref="RestaurantSuggestionResponse.RecommendingAverageThreshold"/> on average (their active rating), never rated
    /// by <paramref name="userId"/>, and at most <see cref="RestaurantSuggestionResponse.MaxRecommendationDistanceKm"/>
    /// away; nearest first, with their global score and the users followed who rated them. Without a valid position, the
    /// distance is measured from the default city and not returned.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user.</param>
    /// <param name="lat">Latitude of the user in degrees, null when unknown.</param>
    /// <param name="lon">Longitude of the user in degrees, null when unknown.</param>
    /// <param name="limit">Maximum number of recommendations.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>At most <paramref name="limit"/> recommendations, nearest first; empty when the user follows nobody or
    /// nothing matches.</returns>
    Task<IReadOnlyList<RestaurantSuggestionResponse>> GetRecommendationsAsync(string userId, double? lat, double? lon, int limit, CancellationToken cancellationToken);
}
