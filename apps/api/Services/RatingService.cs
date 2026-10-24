using System.Linq.Expressions;
using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Interfaces;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Saves and reads the ratings users give to restaurants in the "rating" table.
/// </summary>
public class RatingService(Supabase.Client supabase, IRestaurantService restaurantService) : IRatingService
{
    /// <inheritdoc />
    public async Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<Rating>.Failure(restaurant.Error!);

        RatingAllowanceResponse allowance = await AllowanceAsync(userId, cancellationToken);
        if (!allowance.CanRate)
            return Result<Rating>.Failure(RatingAllowanceResponse.AlreadyRatedToday);

        string id = restaurant.Value!.Id;
        ModeledResponse<Rating> currentActive = await ActiveRatingsQuery(supabase.From<Rating>(), id, userId).Get(cancellationToken);
        IReadOnlyList<Rating> rows = Rating.PlanNew(currentActive.Models, ToRating(id, userId, request));

        // One request is one transaction: the previous active rating is deactivated (update on its primary key) and
        // the new one inserted together, so there is never zero or two active ratings. Two submits racing the same
        // day both pass the check above and, the date being a moment, both insert their own row: the database does not
        // enforce the "one restaurant per day" rule.
        ModeledResponse<Rating> written = await supabase.From<Rating>().Upsert(rows.ToList(), cancellationToken: cancellationToken);
        return Result<Rating>.Success(written.Models.LastOrDefault() ?? rows[^1]);
    }

    /// <inheritdoc />
    public async Task<Result<RatingAllowanceResponse>> GetAllowanceAsync(string userId, CancellationToken cancellationToken)
        => Result<RatingAllowanceResponse>.Success(await AllowanceAsync(userId, cancellationToken));

    /// <summary>
    /// Applies the "one restaurant per day" rule to the latest rating of <paramref name="userId"/>, as of now.
    /// </summary>
    private async Task<RatingAllowanceResponse> AllowanceAsync(string userId, CancellationToken cancellationToken)
    {
        ModeledResponse<Rating> latest = await LatestRatingQuery(supabase.From<Rating>(), userId).Get(cancellationToken);
        return RatingAllowanceResponse.From(latest.Models.FirstOrDefault()?.Date, DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Query of the most recent rating of <paramref name="userId"/>, whatever the restaurant and the active flag.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> LatestRatingQuery(IPostgrestTable<Rating> ratings, string userId)
        => ratings
            .Where(r => r.UserId == userId)
            .Order("date", Constants.Ordering.Descending)
            .Limit(1);

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        ModeledResponse<Rating> response = await RecentActiveRatingsQuery(supabase.From<Rating>(), restaurant.Value!.Id, count).Get(cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(await WithProfilesAsync(response.Models, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<Result<RatingSummaryResponse>> GetSummaryAsync(string restaurantId, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<RatingSummaryResponse>.Failure(restaurant.Error!);

        ModeledResponse<Rating> response = await RestaurantActiveRatingsQuery(supabase.From<Rating>(), restaurant.Value!.Id).Get(cancellationToken);
        return Result<RatingSummaryResponse>.Success(RatingSummaryResponse.From(response.Models));
    }

    /// <summary>
    /// Query of the active rating(s) of <paramref name="restaurantId"/> by <paramref name="userId"/>.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> ActiveRatingsQuery(IPostgrestTable<Rating> ratings, string restaurantId, string userId)
        => ratings
            .Where(r => r.RestaurantId == restaurantId)
            .Where(r => r.UserId == userId)
            .Where(IsActive);

    /// <summary>
    /// Query of the <paramref name="count"/> most recent active ratings of <paramref name="restaurantId"/>, most recent first.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="count">Maximum number of ratings.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> RecentActiveRatingsQuery(IPostgrestTable<Rating> ratings, string restaurantId, int count)
        => RestaurantActiveRatingsQuery(ratings, restaurantId)
            .Order("date", Constants.Ordering.Descending)
            .Limit(count);

    /// <summary>
    /// Query of every active rating of <paramref name="restaurantId"/> (each user's latest).
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> RestaurantActiveRatingsQuery(IPostgrestTable<Rating> ratings, string restaurantId)
        => ratings
            .Where(r => r.RestaurantId == restaurantId)
            .Where(IsActive);

    /// <summary>
    /// Filter on the active ratings. The comparison must be explicit: the Postgrest client cannot translate a bare
    /// boolean member (<c>r => r.IsActive</c>) and throws a NullReferenceException when building the URL. Kept in its own
    /// Where (one top-level filter each) rather than joined with &amp;&amp;, which nests "and" groups in the URL.
    /// </summary>
    private static readonly Expression<Func<Rating, bool>> IsActive = r => r.IsActive == true;

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> GetByRestaurantAndUserAsync(string restaurantId, string userId, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        string id = restaurant.Value!.Id;
        ModeledResponse<Rating> response = await supabase.From<Rating>()
            .Where(r => r.RestaurantId == id && r.UserId == userId)
            .Order("date", Constants.Ordering.Descending)
            .Get(cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(await WithProfilesAsync(response.Models, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<UserRatingResponse>>> GetByUserAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserRatingResponse>>.Failure(UserIds.NotFound);

        ModeledResponse<Rating> response = await supabase.From<Rating>()
            .Where(r => r.UserId == userId)
            .Order("date", Constants.Ordering.Descending)
            .Get(cancellationToken);
        return Result<IReadOnlyList<UserRatingResponse>>.Success(await WithRestaurantsAsync(response.Models, cancellationToken));
    }

    /// <summary>
    /// Loads the profiles of the users who gave <paramref name="ratings"/> in one query, and maps each rating with its
    /// author. "rating.id_user" has no foreign key to "profiles", so PostgREST cannot embed them in the ratings query.
    /// </summary>
    private async Task<IReadOnlyList<RatingResponse>> WithProfilesAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        if (ratings.Count == 0)
            return [];

        List<object> userIds = ratings.Select(r => r.UserId).Distinct().Cast<object>().ToList();
        ModeledResponse<Profile> profiles = await supabase.From<Profile>()
            .Filter("id", Constants.Operator.In, userIds)
            .Get(cancellationToken);
        Dictionary<string, Profile> profilesById = profiles.Models.ToDictionary(p => p.Id);

        return ratings.Select(r => RatingResponse.From(r, profilesById.GetValueOrDefault(r.UserId))).ToList();
    }

    /// <summary>
    /// Loads the restaurants rated in <paramref name="ratings"/> in one query, and maps each rating with its restaurant.
    /// </summary>
    private async Task<IReadOnlyList<UserRatingResponse>> WithRestaurantsAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        if (ratings.Count == 0)
            return [];

        List<object> restaurantIds = ratings.Select(r => r.RestaurantId).Distinct().Cast<object>().ToList();
        ModeledResponse<Restaurant> restaurants = await supabase.From<Restaurant>()
            .Filter("id", Constants.Operator.In, restaurantIds)
            .Get(cancellationToken);
        Dictionary<string, Restaurant> restaurantsById = restaurants.Models.ToDictionary(r => r.Id);

        // The foreign key guarantees the restaurant exists; skip defensively rather than fail the whole list
        return ratings
            .Where(r => restaurantsById.ContainsKey(r.RestaurantId))
            .Select(r => UserRatingResponse.From(r, restaurantsById[r.RestaurantId]))
            .ToList();
    }

    /// <summary>
    /// Maps the request to a new rating row, dated now.
    /// </summary>
    private static Rating ToRating(string restaurantId, string userId, RateRestaurantRequest request) => new()
    {
        RestaurantId = restaurantId,
        UserId = userId,
        Date = DateTimeOffset.UtcNow,
        FoodRating = request.Food,
        ServiceRating = request.Service,
        SettingRating = request.Setting,
        Bonus = request.Bonus
    };
}
