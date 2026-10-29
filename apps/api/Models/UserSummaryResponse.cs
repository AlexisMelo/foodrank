namespace api.Models;

/// <summary>
/// User listed among others (search results, followers, users followed): only what a row shows. Unlike
/// <see cref="UserProfileResponse"/>, it has no number of restaurants rated, which would read the ratings of every user
/// listed.
/// </summary>
/// <param name="Id">Supabase Auth identifier of the user.</param>
/// <param name="Name">Name displayed for the user (see <see cref="Profile.DisplayName"/>).</param>
/// <param name="AvatarUrl">Profile picture, null when there is none.</param>
public record UserSummaryResponse(string Id, string Name, string? AvatarUrl)
{
    /// <summary>
    /// Builds the summary of a user from its profile row.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="profile">Profile row of the user, null when the user has none.</param>
    /// <returns>The summary, anonymous when the user has no user name.</returns>
    public static UserSummaryResponse From(string userId, Profile? profile) => new(
        userId,
        Profile.DisplayName(profile),
        Profile.AvatarUrlOrNull(profile));
}
