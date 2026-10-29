using api.Common;

namespace Api.Tests.Common;

/// <summary>
/// Tests the display name rules: free text of at most 30 characters once trimmed, without control nor invisible
/// formatting characters.
/// </summary>
public class SafeDisplayNameAttributeTests
{
    /// <summary>
    /// Attribute under test.
    /// </summary>
    private readonly SafeDisplayNameAttribute _attribute = new();

    /// <summary>
    /// Free text is valid: any case, accents and other alphabets, numbers, spaces, punctuation, emojis (joined ones
    /// included), markup (shown as text), 30 characters, or more with spaces around, and blank names (they clear it).
    /// </summary>
    [Theory]
    [InlineData("Alexis Melo")]
    [InlineData("élodie_B. 92")]
    [InlineData("Zoë O'Brien-Durand")]
    [InlineData("Алексей")]
    [InlineData("山田太郎")]
    [InlineData("Chef 👩\u200D🍳🍕")]
    [InlineData("<script>alert(1)</script>")]
    [InlineData("abcdefghijklmnopqrstuvwxyz1234")]
    [InlineData("  abcdefghijklmnopqrstuvwxyz1234  ")]
    [InlineData("")]
    [InlineData("   ")]
    public void IsValid_FreeText_ReturnsTrue(string displayName)
    {
        Assert.True(_attribute.IsValid(displayName));
    }

    /// <summary>
    /// Names longer than 30 characters once trimmed, or holding a control character (line break, tab, null) or an
    /// invisible formatting one (right-to-left override, zero width space, soft hyphen), or a line separator, are
    /// invalid.
    /// </summary>
    [Theory]
    [InlineData("abcdefghijklmnopqrstuvwxyz12345")]
    [InlineData("Alexis\nMelo")]
    [InlineData("Alexis\tMelo")]
    [InlineData("Alexis\0")]
    [InlineData("Alexis\u202EoleM")]
    [InlineData("Ale\u200Bxis")]
    [InlineData("Ale\u00ADxis")]
    [InlineData("Alexis\u2028Melo")]
    public void IsValid_TooLongOrHiddenCharacters_ReturnsFalse(string displayName)
    {
        Assert.False(_attribute.IsValid(displayName));
    }

    /// <summary>
    /// Null is valid: no display name, the username is shown.
    /// </summary>
    [Fact]
    public void IsValid_Null_ReturnsTrue()
    {
        Assert.True(_attribute.IsValid(null));
    }

    /// <summary>
    /// A value that is not a string is invalid.
    /// </summary>
    [Fact]
    public void IsValid_NotAString_ReturnsFalse()
    {
        Assert.False(_attribute.IsValid(42));
    }
}
