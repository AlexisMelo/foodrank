namespace api.Models;

/// <summary>
/// A rating returned by GET /api/users/{id}/ratings, with the restaurant it rates.
/// </summary>
/// <param name="RestaurantId">Database identifier of the rated restaurant.</param>
/// <param name="RestaurantName">Name of the rated restaurant.</param>
/// <param name="RestaurantEmoji">Emoji of the rated restaurant.</param>
/// <param name="RestaurantCuisine">Type of cuisine of the rated restaurant, empty when unknown.</param>
/// <param name="Date">Day of the rating, formatted "yyyy-MM-dd" (no time, no time zone).</param>
/// <param name="Food">Food rating, from 0 to 100.</param>
/// <param name="Service">Service rating, from 0 to 100.</param>
/// <param name="Setting">Setting (decor) rating, from 0 to 100.</param>
/// <param name="Bonus">True when the user gave the "instant crush" favorite bonus.</param>
/// <param name="IsActive">True for the user's latest rating of the restaurant, which is their score for it; false for
/// the previous ones, kept as history.</param>
public record UserRatingResponse(
    string RestaurantId,
    string RestaurantName,
    string RestaurantEmoji,
    string RestaurantCuisine,
    string Date,
    float Food,
    float Service,
    float Setting,
    bool Bonus,
    bool IsActive)
{
    /// <summary>
    /// Maps a rating and the restaurant it rates to the API response.
    /// </summary>
    /// <param name="rating">Rating row.</param>
    /// <param name="restaurant">Restaurant of <paramref name="rating"/>.</param>
    /// <returns>The rating with the restaurant's name, emoji and cuisine.</returns>
    public static UserRatingResponse From(Rating rating, Restaurant restaurant) => new(
        restaurant.Id,
        restaurant.Name,
        restaurant.Emoji,
        restaurant.Cuisine,
        Rating.FormatDate(rating.Date),
        rating.FoodRating,
        rating.ServiceRating,
        rating.SettingRating,
        rating.Bonus,
        rating.IsActive);
}
