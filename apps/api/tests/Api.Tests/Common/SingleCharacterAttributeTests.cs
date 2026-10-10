using api.Common;

namespace Api.Tests.Common;

/// <summary>
/// Tests the validation of single character values such as emojis.
/// </summary>
public class SingleCharacterAttributeTests
{
    /// <summary>
    /// Attribute under test.
    /// </summary>
    private readonly SingleCharacterAttribute _attribute = new();

    /// <summary>
    /// One character is valid, including emojis made of several code points (variation selector, zero width joiner,
    /// flag, keycap, skin tone).
    /// </summary>
    [Theory]
    [InlineData("a")]
    [InlineData("🍕")]
    [InlineData("🌶️")]
    [InlineData("👨‍🍳")]
    [InlineData("🇫🇷")]
    [InlineData("1️⃣")]
    [InlineData("👍🏽")]
    public void IsValid_OneCharacter_ReturnsTrue(string value)
    {
        Assert.True(_attribute.IsValid(value));
    }

    /// <summary>
    /// An empty string, several characters or several emojis are invalid.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("🍕🍔")]
    [InlineData(" 🍕")]
    public void IsValid_NotOneCharacter_ReturnsFalse(string value)
    {
        Assert.False(_attribute.IsValid(value));
    }

    /// <summary>
    /// Null is left to <see cref="System.ComponentModel.DataAnnotations.RequiredAttribute"/>.
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
        Assert.False(_attribute.IsValid(1));
    }
}
