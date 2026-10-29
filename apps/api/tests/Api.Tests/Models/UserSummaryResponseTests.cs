using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the summary returned for a user listed among others: id, displayed name and avatar.
/// </summary>
public class UserSummaryResponseTests
{
    /// <summary>
    /// The id, user name and avatar of the profile are returned.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesUsernameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", AvatarUrl = "https://img.test/c.png" };

        Assert.Equal(new UserSummaryResponse("user-1", "camille", "https://img.test/c.png"), UserSummaryResponse.From(profile));
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
