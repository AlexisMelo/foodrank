using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Saves and reads the ratings users give to restaurants.
/// </summary>
public interface IRatingService
{
    /// <summary>
    /// Saves today's rating of <paramref name="restaurantId"/> by <paramref name="userId"/>.
    /// Fails with NotFound when the restaurant does not exist, and Conflict when the user already rated it today.
    /// </summary>
    Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the <paramref name="count"/> most recent ratings of <paramref name="restaurantId"/>, all users included,
    /// most recent first. Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, most recent first.
    /// Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetByUserAsync(string restaurantId, string userId, CancellationToken cancellationToken);
}
