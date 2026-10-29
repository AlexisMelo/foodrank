namespace api.Models;

/// <summary>
/// Profile of a user returned by GET /api/users/{id} (or /api/users/me).
/// </summary>
/// <param name="Id">Supabase Auth identifier of the user.</param>
/// <param name="Username">Unique username of the user.</param>
/// <param name="DisplayName">Name the user chose to be shown, null when there is none (the username is shown
/// instead).</param>
/// <param name="AvatarUrl">Profile picture, null when there is none.</param>
/// <param name="RatedRestaurantsCount">Number of distinct restaurants the user rated (a restaurant rated twice counts once).</param>
public record UserProfileResponse(string Id, string Username, string? DisplayName, string? AvatarUrl, int RatedRestaurantsCount)
{
    /// <summary>
    /// Builds the profile of a user from its profile row and its ratings.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <param name="ratedRestaurantIds">Restaurant id of each rating of the user (duplicates allowed).</param>
    /// <returns>The profile, counting each rated restaurant once.</returns>
    public static UserProfileResponse From(Profile profile, IEnumerable<string> ratedRestaurantIds) => new(
        profile.Id,
        profile.Username,
        Profile.DisplayNameOrNull(profile),
        Profile.AvatarUrlOrNull(profile),
        ratedRestaurantIds.Distinct().Count());
}
