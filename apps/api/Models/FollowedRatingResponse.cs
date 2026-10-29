namespace api.Models;

/// <summary>
/// A rating returned by GET /api/users/me/following/ratings: a recent rating of a user the logged-in user follows, with
/// the restaurant it rates and the name and picture of its author.
/// </summary>
/// <param name="RestaurantId">Database identifier of the rated restaurant.</param>
/// <param name="RestaurantName">Name of the rated restaurant.</param>
/// <param name="RestaurantEmoji">Emoji of the rated restaurant.</param>
/// <param name="Date">Moment of the rating, in UTC.</param>
/// <param name="Food">Food rating, from 0 to 100.</param>
/// <param name="Service">Service rating, from 0 to 100.</param>
/// <param name="Setting">Setting (decor) rating, from 0 to 100.</param>
/// <param name="Bonus">True when the user gave the "instant crush" favorite bonus.</param>
/// <param name="IsActive">True for the author's latest rating of the restaurant, which is their score for it; false for
/// the previous ones, kept as history.</param>
/// <param name="UserId">Supabase Auth identifier of the user who rated.</param>
/// <param name="UserName">Name displayed for the user who rated.</param>
/// <param name="UserAvatarUrl">Profile picture of the user who rated, null when there is none.</param>
public record FollowedRatingResponse(
    string RestaurantId,
    string RestaurantName,
    string RestaurantEmoji,
    DateTimeOffset Date,
    float Food,
    float Service,
    float Setting,
    bool Bonus,
    bool IsActive,
    string UserId,
    string UserName,
    string? UserAvatarUrl)
{
    /// <summary>
    /// Maps a rating, the restaurant it rates and the profile of its author to the API response.
    /// </summary>
    /// <param name="rating">Rating row.</param>
    /// <param name="restaurant">Restaurant of <paramref name="rating"/>.</param>
    /// <param name="profile">Profile row of the author.</param>
    /// <returns>The rating with the restaurant's name and emoji, and the author's user name and avatar.</returns>
    public static FollowedRatingResponse From(Rating rating, Restaurant restaurant, Profile profile) => new(
        restaurant.Id,
        restaurant.Name,
        restaurant.Emoji,
        rating.Date.ToUniversalTime(),
        rating.FoodRating,
        rating.ServiceRating,
        rating.SettingRating,
        rating.Bonus,
        rating.IsActive,
        rating.UserId,
        profile.Username,
        Profile.AvatarUrlOrNull(profile));
}
