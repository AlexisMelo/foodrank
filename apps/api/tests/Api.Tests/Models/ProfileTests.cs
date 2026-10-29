using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the names of a profile: the optional display name, and the name shown where there is room for one only.
/// </summary>
public class ProfileTests
{
    /// <summary>
    /// The display name is kept when the user chose one.
    /// </summary>
    [Fact]
    public void DisplayNameOrNull_WithDisplayName_ReturnsIt()
    {
        Assert.Equal("Camille D.", Profile.DisplayNameOrNull(new Profile { Username = "camille", DisplayName = "Camille D." }));
    }

    /// <summary>
    /// A missing, empty or blank display name is no display name.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void DisplayNameOrNull_NoDisplayName_ReturnsNull(string? displayName)
    {
        Assert.Null(Profile.DisplayNameOrNull(new Profile { Username = "camille", DisplayName = displayName }));
    }

    /// <summary>
    /// The display name is shown when the user chose one.
    /// </summary>
    [Fact]
    public void DisplayedName_WithDisplayName_ReturnsDisplayName()
    {
        Assert.Equal("Camille D.", Profile.DisplayedName(new Profile { Username = "camille", DisplayName = "Camille D." }));
    }

    /// <summary>
    /// The username is shown when there is no display name, or a blank one.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    public void DisplayedName_NoDisplayName_ReturnsUsername(string? displayName)
    {
        Assert.Equal("camille", Profile.DisplayedName(new Profile { Username = "camille", DisplayName = displayName }));
    }
}
