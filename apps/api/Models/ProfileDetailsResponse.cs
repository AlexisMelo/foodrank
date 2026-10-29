namespace api.Models;

/// <summary>
/// Profile of the logged-in user as they edit it, returned by GET and PUT /api/users/me/details: what the edit page
/// shows (username, avatar) and the fields it edits. Identity and age are private: they are only returned to the user
/// themselves, never in <see cref="UserProfileResponse"/>.
/// </summary>
/// <param name="Username">Unique username of the user, which cannot be changed.</param>
/// <param name="DisplayName">Name the user chose to be shown, null when there is none (the username is shown
/// instead).</param>
/// <param name="AvatarUrl">Profile picture, null when there is none.</param>
/// <param name="Identity">Identity of the user, one of <see cref="Identities"/>; null for older accounts.</param>
/// <param name="Age">Age of the user this year, computed from the birth year; null for older accounts.</param>
public record ProfileDetailsResponse(string Username, string? DisplayName, string? AvatarUrl, string? Identity, int? Age)
{
    /// <summary>
    /// Builds the details of a user from its profile row.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <param name="currentYear">Current year, from which the birth year is turned back into an age.</param>
    /// <returns>The details, with the age instead of the birth year.</returns>
    public static ProfileDetailsResponse From(Profile profile, int currentYear) => new(
        profile.Username,
        Profile.DisplayNameOrNull(profile),
        Profile.AvatarUrlOrNull(profile),
        profile.Identity,
        currentYear - profile.BirthYear);
}
