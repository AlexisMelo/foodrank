using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a profile row to the details of the edit profile page.
/// </summary>
public class ProfileDetailsResponseTests
{
    /// <summary>
    /// The username, display name, avatar and identity are copied, and the birth year is turned back into an age.
    /// </summary>
    [Fact]
    public void From_FullProfile_CopiesFieldsAndComputesAge()
    {
        Profile profile = new()
        {
            Id = "user-1",
            Username = "alexis.melo",
            DisplayName = "Alexis Melo",
            AvatarUrl = "https://img.test/me.png",
            BirthYear = 1996,
            Identity = Identities.Man
        };

        ProfileDetailsResponse details = ProfileDetailsResponse.From(profile, 2026);

        Assert.Equal(new ProfileDetailsResponse("alexis.melo", "Alexis Melo", "https://img.test/me.png", Identities.Man, 30), details);
    }

    /// <summary>
    /// An older account, without birth year nor identity, has no age nor identity; blank names and avatars are null.
    /// </summary>
    [Fact]
    public void From_OlderAccount_NullAgeAndIdentity()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", DisplayName = "  ", AvatarUrl = "" };

        ProfileDetailsResponse details = ProfileDetailsResponse.From(profile, 2026);

        Assert.Equal(new ProfileDetailsResponse("camille", null, null, null, null), details);
    }
}
