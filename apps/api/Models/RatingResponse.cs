namespace api.Models;

/// <summary>
/// A rating returned by GET /api/restaurants/{id}/ratings, with the name and picture of the user who gave it.
/// </summary>
/// <param name="RestaurantId">Database identifier of the rated restaurant.</param>
/// <param name="UserId">Supabase Auth identifier of the user who rated.</param>
/// <param name="Date">Moment of the rating, in UTC.</param>
/// <param name="Food">Food rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Service">Service rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Setting">Setting (decor) rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Bonus">True when the user gave the "instant crush" favorite bonus.</param>
/// <param name="IsActive">True for the user's latest rating of the restaurant, which is their score for it; false for
/// the previous ones, kept as history.</param>
/// <param name="UserName">Name displayed for the user who rated: their display name, or their username when they have
/// none.</param>
/// <param name="UserAvatarUrl">Profile picture of the user who rated, null when there is none.</param>
public record RatingResponse(
    string RestaurantId,
    string UserId,
    DateTimeOffset Date,
    int Food,
    int Service,
    int Setting,
    bool Bonus,
    bool IsActive,
    string UserName,
    string? UserAvatarUrl)
{
    /// <summary>
    /// Maps a rating and the profile of its author to the API response.
    /// </summary>
    /// <param name="rating">Rating row.</param>
    /// <param name="profile">Profile row of the author.</param>
    /// <returns>The rating with the author's displayed name and avatar.</returns>
    public static RatingResponse From(Rating rating, Profile profile) => new(
        rating.RestaurantId,
        rating.UserId,
        rating.Date.ToUniversalTime(),
        rating.FoodRating,
        rating.ServiceRating,
        rating.SettingRating,
        rating.Bonus,
        rating.IsActive,
        Profile.DisplayedName(profile),
        Profile.AvatarUrlOrNull(profile));
}
