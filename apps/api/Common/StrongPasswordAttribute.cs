using System.ComponentModel.DataAnnotations;

namespace api.Common;

/// <summary>
/// Validates the password rules shown on the sign up page: at least <see cref="MinLength"/> characters, with at least
/// one letter (any alphabet, accented letters included) and one digit (0-9). Null is valid: combine with
/// <see cref="RequiredAttribute"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class StrongPasswordAttribute()
    : ValidationAttribute($"The {{0}} field must be at least {MinLength} characters long, with at least one letter and one number.")
{
    /// <summary>
    /// Minimum number of characters of a password.
    /// </summary>
    public const int MinLength = 8;

    /// <summary>
    /// Tells whether <paramref name="value"/> is null or a password following the rules.
    /// </summary>
    /// <param name="value">Value to validate.</param>
    /// <returns>True for null or a valid password, false for a password breaking a rule or a non-string.</returns>
    public override bool IsValid(object? value)
        => value is null
            || (value is string password
                && password.Length >= MinLength
                && password.Any(char.IsLetter)
                && password.Any(char.IsAsciiDigit));
}
