namespace api.Models;

/// <summary>
/// User listed among others (search results, followers, users followed): only what a row shows. Unlike
/// <see cref="UserProfileResponse"/>, it has no number of restaurants rated, which would read the ratings of every user
/// listed.
/// </summary>
/// <param name="Id">Supabase Auth identifier of the user.</param>
/// <param name="Name">User name (pseudonym) of the user.</param>
/// <param name="AvatarUrl">Profile picture, null when there is none.</param>
public record UserSummaryResponse(string Id, string Name, string? AvatarUrl)
{
    /// <summary>
    /// Builds the summary of a user from its profile row.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <returns>The summary.</returns>
    public static UserSummaryResponse From(Profile profile) => new(
        profile.Id,
        profile.Username,
        Profile.AvatarUrlOrNull(profile));
}
