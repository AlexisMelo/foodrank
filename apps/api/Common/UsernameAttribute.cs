using System.ComponentModel.DataAnnotations;

namespace api.Common;

/// <summary>
/// Validates the username rules shown on the sign up page: from <see cref="MinLength"/> to <see cref="MaxLength"/>
/// characters, only lowercase letters (a-z), digits (0-9), dots and underscores. The username is unique and cannot be
/// changed, unlike the display name. Null is valid: combine with <see cref="RequiredAttribute"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class UsernameAttribute()
    : ValidationAttribute($"The {{0}} field must be {MinLength} to {MaxLength} characters long, with only lowercase letters, numbers, dots and underscores.")
{
    /// <summary>
    /// Minimum number of characters of a username.
    /// </summary>
    public const int MinLength = 3;

    /// <summary>
    /// Maximum number of characters of a username.
    /// </summary>
    public const int MaxLength = 20;

    /// <summary>
    /// Tells whether <paramref name="value"/> is null or a username following the rules.
    /// </summary>
    /// <param name="value">Value to validate.</param>
    /// <returns>True for null or a valid username, false for a username breaking a rule or a non-string.</returns>
    public override bool IsValid(object? value)
        => value is null
            || (value is string username
                && username.Length is >= MinLength and <= MaxLength
                && username.All(IsAllowed));

    /// <summary>
    /// True for the characters a username can contain: a-z, 0-9, '.' and '_'.
    /// </summary>
    private static bool IsAllowed(char c) => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c) || c is '.' or '_';
}
