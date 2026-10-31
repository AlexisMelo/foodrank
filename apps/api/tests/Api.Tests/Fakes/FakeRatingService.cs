using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IRatingService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as the
/// real service: the restaurant must exist, a user rates at most one restaurant per day (checked with
/// <see cref="RatingAllowanceResponse.From"/>), and a new rating becomes the active one (written with
/// <see cref="Rating.PlanNew"/>, like the real upsert).
/// </summary>
/// <param name="restaurants">Restaurants the ratings can be attached to.</param>
public class FakeRatingService(FakeRestaurantService restaurants) : IRatingService
{
    /// <summary>
    /// Ratings "stored in the database".
    /// </summary>
    public List<Rating> Ratings { get; } = [];

    /// <summary>
    /// Profiles "stored in the database", by user id; like in the database, every user listed or rating has one.
    /// </summary>
    public Dictionary<string, Profile> Profiles { get; } = [];

    /// <summary>
    /// Ids of the users a user follows, standing for the "follow" table read by the real service; nobody by default.
    /// </summary>
    public Func<string, IEnumerable<string>> FollowedUserIds { get; set; } = _ => [];

    /// <summary>
    /// Tierlists the restaurant leaves once its user no longer rates it, as with the real service; set by
    /// <see cref="ApiFactory"/> (the tierlist fake reads the ratings of this one).
    /// </summary>
    public ITierlistService? Tierlists { get; set; }

    /// <inheritdoc />
    public Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Task.FromResult(Result<Rating>.Failure(new Error(ErrorType.NotFound, "Restaurant not found.")));

        if (!Allowance(userId).CanRate)
            return Task.FromResult(Result<Rating>.Failure(RatingAllowanceResponse.AlreadyRatedToday));

        Rating rating = new()
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = DateTimeOffset.UtcNow,
            FoodRating = request.Food,
            ServiceRating = request.Service,
            SettingRating = request.Setting,
            Bonus = request.Bonus
        };
        List<Rating> currentActive = Ratings.Where(r => r.RestaurantId == restaurantId && r.UserId == userId && r.IsActive).ToList();
        IReadOnlyList<Rating> rows = Rating.PlanNew(currentActive, rating);

        // Upsert: replace the rows with the same primary key, add the others
        foreach (Rating row in rows)
        {
            Ratings.RemoveAll(r => r.RestaurantId == row.RestaurantId && r.UserId == row.UserId && r.Date == row.Date);
            Ratings.Add(row);
        }
        return Task.FromResult(Result<Rating>.Success(rows[^1]));
    }

    /// <inheritdoc />
    public Task<Result<RatingAllowanceResponse>> GetAllowanceAsync(string userId, CancellationToken cancellationToken)
        => Task.FromResult(Result<RatingAllowanceResponse>.Success(Allowance(userId)));

    /// <summary>
    /// Like the real service: the rule applied to the user's most recent rating, whatever the restaurant, as of now.
    /// </summary>
    private RatingAllowanceResponse Allowance(string userId)
    {
        DateTimeOffset? lastRatingDate = Ratings.Where(r => r.UserId == userId).Select(r => (DateTimeOffset?)r.Date).Max();
        return RatingAllowanceResponse.From(lastRatingDate, DateTimeOffset.UtcNow);
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken)
        => Task.FromResult(Find(restaurantId, r => r.IsActive, count));

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetRecentFromFollowedUsersAsync(string restaurantId, string userId, int count, CancellationToken cancellationToken)
    {
        HashSet<string> followedIds = FollowedUserIds(userId).ToHashSet();
        return Task.FromResult(Find(restaurantId, r => r.IsActive && followedIds.Contains(r.UserId), count));
    }

    /// <inheritdoc />
    public Task<Result<RatingSummaryResponse>> GetSummaryAsync(string restaurantId, CancellationToken cancellationToken)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Task.FromResult(Result<RatingSummaryResponse>.Failure(new Error(ErrorType.NotFound, "Restaurant not found.")));

        // Like the real query, only the active ratings of the restaurant are averaged
        IEnumerable<Rating> active = Ratings.Where(r => r.RestaurantId == restaurantId && r.IsActive);
        return Task.FromResult(Result<RatingSummaryResponse>.Success(RatingSummaryResponse.From(active)));
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<RatingResponse>>> GetByRestaurantAndUserAsync(string restaurantId, string userId, CancellationToken cancellationToken)
        => Task.FromResult(Find(restaurantId, r => r.UserId == userId, int.MaxValue));

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> DeleteAsync(string restaurantId, string userId, DateTimeOffset date, CancellationToken cancellationToken)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Result<IReadOnlyList<RatingResponse>>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."));

        // Like the real service: the plan of Rating.PlanDeletion, applied to the user's ratings of the restaurant
        RatingDeletion? deletion = Rating.PlanDeletion(Ratings.Where(r => r.RestaurantId == restaurantId && r.UserId == userId).ToList(), date);
        if (deletion is null)
            return Result<IReadOnlyList<RatingResponse>>.Failure(RatingService.RatingNotFound);

        Ratings.Remove(deletion.Deleted);
        if (deletion.Activated is { } activated)
        {
            Ratings.RemoveAll(r => r.RestaurantId == activated.RestaurantId && r.UserId == activated.UserId && r.Date == activated.Date);
            Ratings.Add(activated);
        }
        if (deletion.Remaining.Count == 0 && Tierlists is not null)
            await Tierlists.RemoveRestaurantFromAllAsync(userId, restaurantId, cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(deletion.Remaining.Select(r => RatingResponse.From(r, Profiles[r.UserId])).ToList());
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> DeleteAllAsync(string restaurantId, string userId, CancellationToken cancellationToken)
    {
        if (restaurants.Restaurants.All(r => r.Id != restaurantId))
            return Result<IReadOnlyList<RatingResponse>>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."));

        Ratings.RemoveAll(r => r.RestaurantId == restaurantId && r.UserId == userId);
        if (Tierlists is not null)
            await Tierlists.RemoveRestaurantFromAllAsync(userId, restaurantId, cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success([]);
    }

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

    /// <inheritdoc />
    public Task<IReadOnlyList<FollowedRatingResponse>> GetFromFollowedUsersAsync(string userId, int count, CancellationToken cancellationToken)
    {
        HashSet<string> followedIds = FollowedUserIds(userId).ToHashSet();
        List<FollowedRatingResponse> ratings = Ratings
            .Where(r => followedIds.Contains(r.UserId))
            .OrderByDescending(r => r.Date)
            .Take(count)
            .Select(r => FollowedRatingResponse.From(r, restaurants.Restaurants.Single(x => x.Id == r.RestaurantId), Profiles[r.UserId]))
            .ToList();
        return Task.FromResult<IReadOnlyList<FollowedRatingResponse>>(ratings);
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
            .Select(r => RatingResponse.From(r, Profiles[r.UserId]))
            .ToList();
        return Result<IReadOnlyList<RatingResponse>>.Success(ratings);
    }
}
