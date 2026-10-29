using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the summary returned for a user listed among others: id, username, display name and avatar.
/// </summary>
public class UserSummaryResponseTests
{
    /// <summary>
    /// The id, username, display name and avatar of the profile are returned.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesUsernameDisplayNameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", DisplayName = "Camille D.", AvatarUrl = "https://img.test/c.png" };

        Assert.Equal(
            new UserSummaryResponse("user-1", "camille", "Camille D.", "https://img.test/c.png"),
            UserSummaryResponse.From(profile));
    }

    /// <summary>
    /// A blank display name is sent as no display name: the frontend shows the username instead.
    /// </summary>
    [Fact]
    public void From_BlankDisplayName_HasNoDisplayName()
    {
        Assert.Null(UserSummaryResponse.From(new Profile { Id = "user-1", Username = "camille", DisplayName = " " }).DisplayName);
    }

    /// <summary>
    /// A blank avatar url is sent as no avatar.
    /// </summary>
    [Fact]
    public void From_BlankAvatar_HasNoAvatar()
    {
        Assert.Null(UserSummaryResponse.From(new Profile { Id = "user-1", Username = "camille", AvatarUrl = " " }).AvatarUrl);
    }
}
