using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Saves the ratings users give to restaurants.
/// </summary>
public interface IRatingService
{
    /// <summary>
    /// Saves today's rating of <paramref name="restaurantId"/> by <paramref name="userId"/>.
    /// Fails with NotFound when the restaurant does not exist, and Conflict when the user already rated it today.
    /// </summary>
    Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken);
}
