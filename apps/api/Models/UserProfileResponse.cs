namespace api.Models;

/// <summary>
/// Profile of a user returned by GET /api/users/{id} (or /api/users/me).
/// </summary>
/// <param name="Id">Supabase Auth identifier of the user.</param>
/// <param name="Name">Name displayed for the user (see <see cref="Profile.DisplayName"/>).</param>
/// <param name="AvatarUrl">Profile picture, null when there is none.</param>
/// <param name="RatedRestaurantsCount">Number of distinct restaurants the user rated (a restaurant rated twice counts once).</param>
public record UserProfileResponse(string Id, string Name, string? AvatarUrl, int RatedRestaurantsCount)
{
    /// <summary>
    /// Builds the profile of a user from its profile row and its ratings.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="profile">Profile row of the user, null when the user has none.</param>
    /// <param name="ratedRestaurantIds">Restaurant id of each rating of the user (duplicates allowed).</param>
    /// <returns>The profile, counting each rated restaurant once.</returns>
    public static UserProfileResponse From(string userId, Profile? profile, IEnumerable<string> ratedRestaurantIds) => new(
        userId,
        Profile.DisplayName(profile),
        Profile.AvatarUrlOrNull(profile),
        ratedRestaurantIds.Distinct().Count());
}
