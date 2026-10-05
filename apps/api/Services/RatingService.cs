using api.Common;
using api.Models;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Saves the ratings users give to restaurants in the "rating" table.
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
