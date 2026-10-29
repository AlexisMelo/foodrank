using api.Common;

namespace Api.Tests.Common;

/// <summary>
/// Tests the username rules: 3 to 20 characters, only lowercase letters, digits, dots and underscores.
/// </summary>
public class UsernameAttributeTests
{
    /// <summary>
    /// Attribute under test.
    /// </summary>
    private readonly UsernameAttribute _attribute = new();

    /// <summary>
    /// Usernames following every rule are valid.
    /// </summary>
    [Theory]
    [InlineData("abc")]
    [InlineData("alex")]
    [InlineData("alex.martin")]
    [InlineData("alex_92")]
    [InlineData("_.9")]
    [InlineData("abcdefghijklmnopqrst")]
    public void IsValid_ValidUsername_ReturnsTrue(string username)
    {
        Assert.True(_attribute.IsValid(username));
    }

    /// <summary>
    /// Usernames breaking a rule are invalid: too short or too long, capitals, spaces, accents, other symbols, or a
    /// trailing line break.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("abcdefghijklmnopqrstu")]
    [InlineData("Alex")]
    [InlineData("ALEX")]
    [InlineData("alex martin")]
    [InlineData(" alex")]
    [InlineData("élodie")]
    [InlineData("alex-martin")]
    [InlineData("alex@home")]
    [InlineData("alex\n")]
    [InlineData("<b>alex</b>")]
    public void IsValid_InvalidUsername_ReturnsFalse(string username)
    {
        Assert.False(_attribute.IsValid(username));
    }

    /// <summary>
    /// Null is valid: the Required attribute refuses a missing username.
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
        Assert.False(_attribute.IsValid(12345));
    }
}
