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

        Assert.Equal(new UserSummaryResponse("user-1", "camille", "https://img.test/c.png"), UserSummaryResponse.From("user-1", profile));
    }

    /// <summary>
    /// Without user name or profile, the user is anonymous, without avatar.
    /// </summary>
    [Fact]
    public void From_NoUsername_IsAnonymous()
    {
        Assert.Equal(Profile.AnonymousName, UserSummaryResponse.From("user-1", new Profile { Username = " " }).Name);
        Assert.Equal(Profile.AnonymousName, UserSummaryResponse.From("user-1", new Profile()).Name);
        Assert.Equal(new UserSummaryResponse("user-1", Profile.AnonymousName, null), UserSummaryResponse.From("user-1", null));
    }
}
