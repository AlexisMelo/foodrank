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

    /// <summary>
    /// Profiles "stored in the database", by user id; a user without profile is shown as anonymous.
    /// </summary>
    public Dictionary<string, Profile> Profiles { get; } = [];

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

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken)
        => Task.FromResult(Find(restaurantId, r => true, count));

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetByRestaurantAndUserAsync(string restaurantId, string userId, CancellationToken cancellationToken)
        => Task.FromResult(Find(restaurantId, r => r.UserId == userId, int.MaxValue));

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserRatingResponse>>> GetByUserAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Task.FromResult(Result<IReadOnlyList<UserRatingResponse>>.Failure(UserIds.NotFound));

        List<UserRatingResponse> userRatings = Ratings
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.Date)
            .Select(r => UserRatingResponse.From(r, restaurants.Restaurants.Single(x => x.Id == r.RestaurantId)))
            .ToList();
        return Task.FromResult(Result<IReadOnlyList<UserRatingResponse>>.Success(userRatings));
    }

    /// <summary>
    /// Returns at most <paramref name="count"/> ratings of the restaurant matching <paramref name="predicate"/>, most
    /// recent first and with their author, or NotFound when the restaurant does not exist.
    /// </summary>
    private Result<IReadOnlyList<RatingResponse>> Find(string restaurantId, Func<Rating, bool> predicate, int count)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Result<IReadOnlyList<RatingResponse>>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."));

        List<RatingResponse> ratings = Ratings
            .Where(r => r.RestaurantId == restaurantId && predicate(r))
            .OrderByDescending(r => r.Date)
            .Take(count)
            .Select(r => RatingResponse.From(r, Profiles.GetValueOrDefault(r.UserId)))
            .ToList();
        return Result<IReadOnlyList<RatingResponse>>.Success(ratings);
    }
}
