namespace api.Models;

/// <summary>
/// A rating returned by GET /api/restaurants/{id}/ratings, with the name and picture of the user who gave it.
/// </summary>
/// <param name="RestaurantId">Database identifier of the rated restaurant.</param>
/// <param name="UserId">Supabase Auth identifier of the user who rated.</param>
/// <param name="Date">Day of the rating, formatted "yyyy-MM-dd" (no time, no time zone).</param>
/// <param name="Food">Food rating, from 0 to 100.</param>
/// <param name="Service">Service rating, from 0 to 100.</param>
/// <param name="Setting">Setting (decor) rating, from 0 to 100.</param>
/// <param name="Bonus">True when the user gave the "instant crush" favorite bonus.</param>
/// <param name="IsActive">True for the user's latest rating of the restaurant, which is their score for it; false for
/// the previous ones, kept as history.</param>
/// <param name="UserName">Name displayed for the user who rated.</param>
/// <param name="UserAvatarUrl">Profile picture of the user who rated, null when there is none.</param>
public record RatingResponse(
    string RestaurantId,
    string UserId,
    string Date,
    float Food,
    float Service,
    float Setting,
    bool Bonus,
    bool IsActive,
    string UserName,
    string? UserAvatarUrl)
{
    /// <summary>
    /// Maps a rating and the profile of its author to the API response.
    /// </summary>
    /// <param name="rating">Rating row.</param>
    /// <param name="profile">Profile row of the author, null when the user has none.</param>
    /// <returns>The rating with the author's <see cref="Profile.DisplayName"/> and avatar.</returns>
    public static RatingResponse From(Rating rating, Profile? profile) => new(
        rating.RestaurantId,
        rating.UserId,
        Rating.FormatDate(rating.Date),
        rating.FoodRating,
        rating.ServiceRating,
        rating.SettingRating,
        rating.Bonus,
        rating.IsActive,
        Profile.DisplayName(profile),
        Profile.AvatarUrlOrNull(profile));
}
