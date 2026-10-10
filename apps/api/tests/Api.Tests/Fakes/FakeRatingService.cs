using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IRatingService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as the
/// real service: the restaurant must exist, a user rates a restaurant at most once per day, and a new rating becomes
/// the active one (written with <see cref="Rating.PlanNew"/>, like the real upsert).
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

        Rating rating = new()
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = DateTime.UtcNow.Date,
            FoodRating = request.Food,
            ServiceRating = request.Service,
            SettingRating = request.Setting,
            Bonus = request.Bonus
        };
        List<Rating> currentActive = Ratings.Where(r => r.RestaurantId == restaurantId && r.UserId == userId && r.IsActive).ToList();
        Result<IReadOnlyList<Rating>> rows = Rating.PlanNew(currentActive, rating);
        if (!rows.IsSuccess)
            return Task.FromResult(Result<Rating>.Failure(rows.Error!));

        // Upsert: replace the rows with the same primary key, add the others
        foreach (Rating row in rows.Value!)
        {
            Ratings.RemoveAll(r => r.RestaurantId == row.RestaurantId && r.UserId == row.UserId && r.Date == row.Date);
            Ratings.Add(row);
        }
        return Task.FromResult(Result<Rating>.Success(rows.Value[^1]));
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken)
        => Task.FromResult(Find(restaurantId, r => r.IsActive, count));

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
