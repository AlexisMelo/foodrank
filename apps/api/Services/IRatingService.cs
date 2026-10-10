using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Saves and reads the ratings users give to restaurants. A new rating becomes the user's active rating of the
/// restaurant and the previous one is deactivated (stored "is_active" flag), so only the latest one is active.
/// </summary>
public interface IRatingService
{
    /// <summary>
    /// Saves today's rating of <paramref name="restaurantId"/> by <paramref name="userId"/> as their active rating,
    /// deactivating the previous one. Fails with NotFound when the restaurant does not exist, and Conflict when the user already rated it today.
    /// </summary>
    Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the <paramref name="count"/> most recent active ratings of <paramref name="restaurantId"/> (each user's
    /// latest), all users included, most recent first. Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, most recent first.
    /// Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetByRestaurantAndUserAsync(string restaurantId, string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every rating of <paramref name="userId"/>, all restaurants included, most recent first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings with their restaurant, or a NotFound failure when <paramref name="userId"/> is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserRatingResponse>>> GetByUserAsync(string userId, CancellationToken cancellationToken);
}
