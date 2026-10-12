using System.ComponentModel.DataAnnotations;
using api.Common;

namespace api.Models;

/// <summary>
/// Body of POST /api/auth/signup: everything the user entered in the sign up steps. Invalid values are rejected with
/// a 400.
/// </summary>
/// <param name="Email">Email address of the new account.</param>
/// <param name="Password">Password of the new account, following the <see cref="StrongPasswordAttribute"/> rules.</param>
/// <param name="Username">Pseudonym displayed for the user: from <see cref="UsernameMinLength"/> to
/// <see cref="UsernameMaxLength"/> characters, without spaces around it (the frontend trims it).</param>
/// <param name="Age">Age of the user, from 0 to <see cref="MaxAge"/>. Only the birth year it gives is stored.</param>
/// <param name="Identity">Identity of the user, one of <see cref="Identities"/>.</param>
public record SignupRequest(
    [Required, EmailAddress] string Email,
    [Required, StrongPassword] string Password,
    [Required,
     StringLength(SignupRequest.UsernameMaxLength, MinimumLength = SignupRequest.UsernameMinLength),
     RegularExpression(@"^\S(.*\S)?$", ErrorMessage = "The Username field must not start or end with a space.")]
    string Username,
    [Required, Range(0, SignupRequest.MaxAge)] int? Age,
    [Required, AllowedValues(Identities.Man, Identities.Woman, Identities.NonBinary)] string Identity)
{
    /// <summary>
    /// Minimum length of <see cref="Username"/>.
    /// </summary>
    public const int UsernameMinLength = 3;

    /// <summary>
    /// Maximum length of <see cref="Username"/>.
    /// </summary>
    public const int UsernameMaxLength = 30;

    /// <summary>
    /// Maximum value of <see cref="Age"/>.
    /// </summary>
    public const int MaxAge = 120;

    /// <summary>
    /// Maps the request to the profile row of the account just created.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the new account.</param>
    /// <param name="currentYear">Current year, from which the age is turned into a birth year.</param>
    /// <returns>The row to save, with the birth year instead of the age.</returns>
    public Profile ToProfile(string userId, int currentYear) => new()
    {
        Id = userId,
        Username = Username,
        BirthYear = currentYear - Age!.Value,
        Identity = Identity
    };
}
