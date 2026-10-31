using System.Globalization;
using System.Linq.Expressions;
using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Interfaces;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Saves, reads and deletes the ratings users give to restaurants in the "rating" table.
/// </summary>
/// <param name="supabase">Client of the Supabase database.</param>
/// <param name="restaurantService">Checks that the restaurant rated exists.</param>
/// <param name="tierlistService">Removes a restaurant from the tierlists of a user who no longer rates it.</param>
public class RatingService(Supabase.Client supabase, IRestaurantService restaurantService, ITierlistService tierlistService) : IRatingService
{
    /// <summary>
    /// Error returned when deleting a rating the user did not give.
    /// </summary>
    public static Error RatingNotFound { get; } = new(ErrorType.NotFound, "Rating not found.");

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
    public async Task<Result<IReadOnlyList<RatingResponse>>> GetRecentFromFollowedUsersAsync(string restaurantId, string userId, int count, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        List<string> followedIds = await FollowedIdsAsync(userId, cancellationToken);
        if (followedIds.Count == 0)
            return Result<IReadOnlyList<RatingResponse>>.Success([]);

        ModeledResponse<Rating> response = await UsersRecentActiveRatingsQuery(supabase.From<Rating>(), restaurant.Value!.Id, followedIds, count).Get(cancellationToken);
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
    /// Query of the <paramref name="count"/> most recent active ratings of <paramref name="restaurantId"/> given by any
    /// of <paramref name="userIds"/>, most recent first.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userIds">Supabase Auth ids of the authors (not empty: PostgREST refuses an empty list).</param>
    /// <param name="count">Maximum number of ratings.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> UsersRecentActiveRatingsQuery(IPostgrestTable<Rating> ratings, string restaurantId, IReadOnlyList<string> userIds, int count)
        => RecentActiveRatingsQuery(ratings, restaurantId, count)
            .Filter("id_user", Constants.Operator.In, userIds.Cast<object>().ToList());

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

        ModeledResponse<Rating> response = await UserRatingsQuery(supabase.From<Rating>(), restaurant.Value!.Id, userId)
            .Order("date", Constants.Ordering.Descending)
            .Get(cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(await WithProfilesAsync(response.Models, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> DeleteAsync(string restaurantId, string userId, DateTimeOffset date, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        string id = restaurant.Value!.Id;
        ModeledResponse<Rating> ratings = await UserRatingsQuery(supabase.From<Rating>(), id, userId).Get(cancellationToken);
        RatingDeletion? deletion = Rating.PlanDeletion(ratings.Models, date);
        if (deletion is null)
            return Result<IReadOnlyList<RatingResponse>>.Failure(RatingNotFound);

        // Deleted first, then the previous rating activated, in two requests: a failure in between leaves the user
        // without an active rating (their next rating becomes active), never with two. The moment read from the
        // database is the one filtered, to the microsecond
        await RatingQuery(supabase.From<Rating>(), id, userId, deletion.Deleted.Date).Delete(cancellationToken: cancellationToken);
        if (deletion.Activated is not null)
            await supabase.From<Rating>().Upsert(deletion.Activated, cancellationToken: cancellationToken);
        if (deletion.Remaining.Count == 0)
            await tierlistService.RemoveRestaurantFromAllAsync(userId, id, cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(await WithProfilesAsync(deletion.Remaining, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> DeleteAllAsync(string restaurantId, string userId, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        string id = restaurant.Value!.Id;
        await UserRatingsQuery(supabase.From<Rating>(), id, userId).Delete(cancellationToken: cancellationToken);
        await tierlistService.RemoveRestaurantFromAllAsync(userId, id, cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success([]);
    }

    /// <summary>
    /// Query of every rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, active or not. Both keys
    /// are filtered, each in its own Where, so a delete sent with it never removes other users' or restaurants' ratings.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> UserRatingsQuery(IPostgrestTable<Rating> ratings, string restaurantId, string userId)
        => ratings
            .Where(r => r.RestaurantId == restaurantId)
            .Where(r => r.UserId == userId);

    /// <summary>
    /// Query of the rating of <paramref name="restaurantId"/> given by <paramref name="userId"/> at
    /// <paramref name="date"/>: its whole primary key, so a delete sent with it removes this rating only.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="date">Moment of the rating, as read from the database (microseconds).</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> RatingQuery(IPostgrestTable<Rating> ratings, string restaurantId, string userId, DateTimeOffset date)
        // Written in UTC with its microseconds, without the "+" of an offset, which an URL would read as a space
        => UserRatingsQuery(ratings, restaurantId, userId)
            .Filter("date", Constants.Operator.Equals, date.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture));

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

    /// <inheritdoc />
    public async Task<IReadOnlyList<FollowedRatingResponse>> GetFromFollowedUsersAsync(string userId, int count, CancellationToken cancellationToken)
    {
        List<string> followedIds = await FollowedIdsAsync(userId, cancellationToken);
        if (followedIds.Count == 0)
            return [];

        ModeledResponse<Rating> response = await UsersRecentRatingsQuery(supabase.From<Rating>(), followedIds, count).Get(cancellationToken);
        if (response.Models.Count == 0)
            return [];

        Dictionary<string, Restaurant> restaurantsById = await RestaurantsByIdAsync(response.Models, cancellationToken);
        Dictionary<string, Profile> profilesById = await ProfilesByIdAsync(response.Models, cancellationToken);

        // The foreign key guarantees the restaurant exists; skip defensively rather than fail the whole list
        return response.Models
            .Where(r => restaurantsById.ContainsKey(r.RestaurantId))
            .Select(r => FollowedRatingResponse.From(r, restaurantsById[r.RestaurantId], profilesById[r.UserId]))
            .ToList();
    }

    /// <summary>
    /// Query of the <paramref name="count"/> most recent ratings given by any of <paramref name="userIds"/>, active or
    /// not, all restaurants included, most recent first.
    /// </summary>
    /// <param name="ratings">Query on the "rating" table to filter.</param>
    /// <param name="userIds">Supabase Auth ids of the authors (not empty: PostgREST refuses an empty list).</param>
    /// <param name="count">Maximum number of ratings.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Rating> UsersRecentRatingsQuery(IPostgrestTable<Rating> ratings, IReadOnlyList<string> userIds, int count)
        => ratings
            .Filter("id_user", Constants.Operator.In, userIds.Cast<object>().ToList())
            .Order("date", Constants.Ordering.Descending)
            .Limit(count);

    /// <summary>
    /// Loads the ids of the users <paramref name="userId"/> follows.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the follower.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The ids, empty when the user follows nobody.</returns>
    private async Task<List<string>> FollowedIdsAsync(string userId, CancellationToken cancellationToken)
    {
        // Only the ids of the users followed are needed
        ModeledResponse<Follow> follows = await supabase.From<Follow>()
            .Select("id_followed")
            .Where(f => f.FollowerId == userId)
            .Get(cancellationToken);
        return follows.Models.Select(f => f.FollowedId).ToList();
    }

    /// <summary>
    /// Maps each of <paramref name="ratings"/> with its author.
    /// </summary>
    private async Task<IReadOnlyList<RatingResponse>> WithProfilesAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        if (ratings.Count == 0)
            return [];

        Dictionary<string, Profile> profilesById = await ProfilesByIdAsync(ratings, cancellationToken);
        return ratings.Select(r => RatingResponse.From(r, profilesById[r.UserId])).ToList();
    }

    /// <summary>
    /// Maps each of <paramref name="ratings"/> with its restaurant.
    /// </summary>
    private async Task<IReadOnlyList<UserRatingResponse>> WithRestaurantsAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        if (ratings.Count == 0)
            return [];

        Dictionary<string, Restaurant> restaurantsById = await RestaurantsByIdAsync(ratings, cancellationToken);

        // The foreign key guarantees the restaurant exists; skip defensively rather than fail the whole list
        return ratings
            .Where(r => restaurantsById.ContainsKey(r.RestaurantId))
            .Select(r => UserRatingResponse.From(r, restaurantsById[r.RestaurantId]))
            .ToList();
    }

    /// <summary>
    /// Loads the profiles of the users who gave <paramref name="ratings"/> in one query. "rating.id_user" has no foreign
    /// key to "profiles", so PostgREST cannot embed them in the ratings query.
    /// </summary>
    /// <param name="ratings">Ratings whose authors are loaded, not empty.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The profiles by user id.</returns>
    private async Task<Dictionary<string, Profile>> ProfilesByIdAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        List<object> userIds = ratings.Select(r => r.UserId).Distinct().Cast<object>().ToList();
        ModeledResponse<Profile> profiles = await supabase.From<Profile>()
            .Filter("id", Constants.Operator.In, userIds)
            .Get(cancellationToken);
        return profiles.Models.ToDictionary(p => p.Id);
    }

    /// <summary>
    /// Loads the restaurants rated in <paramref name="ratings"/> in one query.
    /// </summary>
    /// <param name="ratings">Ratings whose restaurants are loaded, not empty.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The restaurants by id.</returns>
    private async Task<Dictionary<string, Restaurant>> RestaurantsByIdAsync(IReadOnlyList<Rating> ratings, CancellationToken cancellationToken)
    {
        List<object> restaurantIds = ratings.Select(r => r.RestaurantId).Distinct().Cast<object>().ToList();
        ModeledResponse<Restaurant> restaurants = await supabase.From<Restaurant>()
            .Filter("id", Constants.Operator.In, restaurantIds)
            .Get(cancellationToken);
        return restaurants.Models.ToDictionary(r => r.Id);
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
