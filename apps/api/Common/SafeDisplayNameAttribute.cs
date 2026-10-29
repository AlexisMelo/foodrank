using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace api.Common;

/// <summary>
/// Validates a display name: free text (any alphabet and case, numbers, spaces, punctuation, emojis) of at most
/// <see cref="MaxLength"/> characters once trimmed, without control characters (line breaks, tabs...) nor invisible
/// formatting characters (e.g. a right-to-left override), which could break or disguise the name where it is shown.
/// The zero width joiner stays allowed, emojis such as 👩‍🍳 being made with it. Markup needs no rule: the name is
/// stored as given and the frontend shows it as text. Null and blank names are valid: they clear the display name.
/// </summary>
public sealed class SafeDisplayNameAttribute()
    : ValidationAttribute($"The {{0}} field must be at most {MaxLength} characters long, without line breaks nor invisible characters.")
{
    /// <summary>
    /// Maximum length of a display name once trimmed, in UTF-16 code units (an emoji counts as 2), like the length
    /// checked by the frontend.
    /// </summary>
    public const int MaxLength = 30;

    /// <summary>
    /// Zero width joiner, a formatting character joining emojis into one (👩 + 🍳 = 👩‍🍳).
    /// </summary>
    private const char ZeroWidthJoiner = '\u200D';

    /// <inheritdoc />
    public override bool IsValid(object? value)
        => value is null
            || (value is string displayName
                && displayName.Trim().Length <= MaxLength
                && displayName.All(IsAllowed));

    /// <summary>
    /// Tells whether <paramref name="c"/> can be part of a display name.
    /// </summary>
    private static bool IsAllowed(char c)
        => c == ZeroWidthJoiner
            || CharUnicodeInfo.GetUnicodeCategory(c) is not (UnicodeCategory.Control
                or UnicodeCategory.Format
                or UnicodeCategory.LineSeparator
                or UnicodeCategory.ParagraphSeparator);
}
