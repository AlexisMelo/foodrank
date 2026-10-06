using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IRatingService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as the
/// database: the restaurant must exist and a user rates a restaurant at most once per day.
/// </summary>
/// <param name="restaurants">Restaurants the ratings can be attached to.</param>
public class FakeRatingService(FakeRestaurantService restaurants) : IRatingService
{
    /// <summary>
    /// Ratings "stored in the database".
    /// </summary>
    public List<Rating> Ratings { get; } = [];

    /// <inheritdoc />
    public Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Task.FromResult(Result<Rating>.Failure(new Error(ErrorType.NotFound, "Restaurant not found.")));

        DateTime today = DateTime.UtcNow.Date;
        if (Ratings.Any(r => r.RestaurantId == restaurantId && r.UserId == userId && r.Date == today))
            return Task.FromResult(Result<Rating>.Failure(new Error(ErrorType.Conflict, "You already rated this restaurant today.")));

        Rating rating = new()
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = today,
            FoodRating = request.Food,
            ServiceRating = request.Service,
            SettingRating = request.Setting,
            Bonus = request.Bonus
        };
        Ratings.Add(rating);
        return Task.FromResult(Result<Rating>.Success(rating));
    }
}
