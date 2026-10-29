using System.ComponentModel.DataAnnotations;
using api.Common;

namespace api.Models;

/// <summary>
/// Body of PUT /api/users/me/details: every field of the edit profile page. Invalid values are rejected with a 400.
/// The username cannot be changed, so it is not part of it.
/// </summary>
/// <param name="DisplayName">Name to show instead of the username, following the <see cref="SafeDisplayNameAttribute"/>
/// rules; null or blank to show the username.</param>
/// <param name="Identity">Identity of the user, one of <see cref="Identities"/>.</param>
/// <param name="Age">Age of the user, from 0 to <see cref="SignupRequest.MaxAge"/>. Only the birth year it gives is
/// stored.</param>
public record UpdateProfileDetailsRequest(
    [SafeDisplayName] string? DisplayName,
    [Required, AllowedValues(Identities.Man, Identities.Woman, Identities.NonBinary)] string Identity,
    [Required, Range(0, SignupRequest.MaxAge)] int? Age)
{
    /// <summary>
    /// Copies the request into the profile row of the user, leaving its other columns (username, avatar) as they are.
    /// </summary>
    /// <param name="profile">Profile row of the user, changed in place.</param>
    /// <param name="currentYear">Current year, from which the age is turned into a birth year.</param>
    public void ApplyTo(Profile profile, int currentYear)
    {
        profile.DisplayName = string.IsNullOrWhiteSpace(DisplayName) ? null : DisplayName.Trim();
        profile.Identity = Identity;
        profile.BirthYear = currentYear - Age!.Value;
    }
}
