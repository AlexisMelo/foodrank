using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
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

        Rating rating = ToRating(restaurant.Value!.Id, userId, request);

        // Insert, not upsert: the primary key (restaurant, user, date) allows one rating per day, and a second one
        // the same day must be refused rather than overwrite the first.
        try
        {
            ModeledResponse<Rating> inserted = await supabase.From<Rating>().Insert(rating, cancellationToken: cancellationToken);
            return Result<Rating>.Success(inserted.Models.FirstOrDefault() ?? rating);
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsUniqueViolation(ex))
        {
            return Result<Rating>.Failure(new Error(ErrorType.Conflict, "You already rated this restaurant today."));
        }
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken)
    {
        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<IReadOnlyList<RatingResponse>>.Failure(restaurant.Error!);

        string id = restaurant.Value!.Id;
        ModeledResponse<Rating> response = await supabase.From<Rating>()
            .Where(r => r.RestaurantId == id)
            .Order("date", Constants.Ordering.Descending)
            .Limit(count)
            .Get(cancellationToken);
        return Result<IReadOnlyList<RatingResponse>>.Success(await WithProfilesAsync(response.Models, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<RatingResponse>>> GetByUserAsync(string restaurantId, string userId, CancellationToken cancellationToken)
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
    /// Maps the request to a new rating row, dated today (UTC).
    /// </summary>
    private static Rating ToRating(string restaurantId, string userId, RateRestaurantRequest request) => new()
    {
        RestaurantId = restaurantId,
        UserId = userId,
        // Unspecified kind so the date is serialized without time zone ("2026-10-01T00:00:00") for the "date" column
        Date = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Unspecified),
        FoodRating = request.Food,
        ServiceRating = request.Service,
        SettingRating = request.Setting,
        Bonus = request.Bonus
    };
}
