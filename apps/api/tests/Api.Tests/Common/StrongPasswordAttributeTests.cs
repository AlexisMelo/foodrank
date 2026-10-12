using api.Common;

namespace Api.Tests.Common;

/// <summary>
/// Tests the password rules of the sign up: at least 8 characters, one letter and one number.
/// </summary>
public class StrongPasswordAttributeTests
{
    /// <summary>
    /// Attribute under test.
    /// </summary>
    private readonly StrongPasswordAttribute _attribute = new();

    /// <summary>
    /// A password of 8 characters or more with a letter and a digit is valid, whatever its other characters
    /// (accented letters count as letters).
    /// </summary>
    [Theory]
    [InlineData("abcdefg1")]
    [InlineData("1234567a")]
    [InlineData("1234567é")]
    [InlineData("Pass word 2026 !")]
    public void IsValid_FollowsRules_ReturnsTrue(string password)
    {
        Assert.True(_attribute.IsValid(password));
    }

    /// <summary>
    /// A password too short, without letter or without digit is invalid.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("abcdef1")]
    [InlineData("abcdefgh")]
    [InlineData("12345678")]
    [InlineData("!!!!!!!!")]
    public void IsValid_BreaksARule_ReturnsFalse(string password)
    {
        Assert.False(_attribute.IsValid(password));
    }

    /// <summary>
    /// Null is left to [Required]; a value that is not a string is invalid.
    /// </summary>
    [Fact]
    public void IsValid_NullOrNotString()
    {
        Assert.True(_attribute.IsValid(null));
        Assert.False(_attribute.IsValid(12345678));
    }
}
