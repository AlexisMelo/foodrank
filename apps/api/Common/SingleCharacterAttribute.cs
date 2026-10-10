using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace api.Common;

/// <summary>
/// Validates that a string is exactly one character as the user sees it (one grapheme cluster), so an emoji made of
/// several code points (👨‍🍳, 🇫🇷, 🌶️) counts as one. Null is valid: combine with <see cref="RequiredAttribute"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class SingleCharacterAttribute() : ValidationAttribute("The {0} field must be a single character, such as one emoji.")
{
    /// <summary>
    /// Tells whether <paramref name="value"/> is null or a string of exactly one grapheme cluster.
    /// </summary>
    /// <param name="value">Value to validate.</param>
    /// <returns>True for null or a single character, false for an empty string, several characters or a non-string.</returns>
    public override bool IsValid(object? value)
        => value is null || (value is string text && new StringInfo(text).LengthInTextElements == 1);
}
