using System.Globalization;

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
    string UserName,
    string? UserAvatarUrl)
{
    /// <summary>
    /// Name displayed when the user has no profile, or neither a full name nor a user name.
    /// </summary>
    public const string AnonymousUserName = "Anonymous";

    /// <summary>
    /// Maps a rating and the profile of its author (null when the user has no profile row) to the API response.
    /// The displayed name is the full name, then the user name, then <see cref="AnonymousUserName"/>.
    /// </summary>
    public static RatingResponse From(Rating rating, Profile? profile) => new(
        rating.RestaurantId,
        rating.UserId,
        rating.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        rating.FoodRating,
        rating.ServiceRating,
        rating.SettingRating,
        rating.Bonus,
        FirstNonBlank(profile?.FullName, profile?.Username) ?? AnonymousUserName,
        string.IsNullOrWhiteSpace(profile?.AvatarUrl) ? null : profile.AvatarUrl);

    /// <summary>
    /// Returns the first value that is neither null nor whitespace, or null when there is none.
    /// </summary>
    private static string? FirstNonBlank(params string?[] values)
        => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
