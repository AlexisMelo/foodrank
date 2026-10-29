using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests how an edit of the profile details changes the profile row.
/// </summary>
public class UpdateProfileDetailsRequestTests
{
    /// <summary>
    /// Profile row of the user before the edit.
    /// </summary>
    private static Profile CurrentProfile() => new()
    {
        Id = "user-1",
        Username = "alexis.melo",
        DisplayName = "Alex",
        AvatarUrl = "https://img.test/me.png",
        BirthYear = 2000,
        Identity = Identities.Woman
    };

    /// <summary>
    /// The display name is trimmed, the identity copied and the age replaced by the birth year; the username and the
    /// avatar stay as they are.
    /// </summary>
    [Fact]
    public void ApplyTo_ValidRequest_ChangesTheEditedFieldsOnly()
    {
        Profile profile = CurrentProfile();

        new UpdateProfileDetailsRequest("  Alexis Melo ", Identities.NonBinary, 30).ApplyTo(profile, 2026);

        Assert.Equal("Alexis Melo", profile.DisplayName);
        Assert.Equal(Identities.NonBinary, profile.Identity);
        Assert.Equal(1996, profile.BirthYear);
        Assert.Equal("user-1", profile.Id);
        Assert.Equal("alexis.melo", profile.Username);
        Assert.Equal("https://img.test/me.png", profile.AvatarUrl);
    }

    /// <summary>
    /// A null or blank display name clears it: the username is shown again.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ApplyTo_NoDisplayName_ClearsIt(string? displayName)
    {
        Profile profile = CurrentProfile();

        new UpdateProfileDetailsRequest(displayName, Identities.Woman, 26).ApplyTo(profile, 2026);

        Assert.Null(profile.DisplayName);
    }
}
