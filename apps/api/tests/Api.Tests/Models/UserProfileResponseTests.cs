using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the profile returned for a user: displayed name, avatar and number of restaurants rated.
/// </summary>
public class UserProfileResponseTests
{
    /// <summary>
    /// Profile mapped by the tests that do not look at it.
    /// </summary>
    private static readonly Profile SampleProfile = new() { Id = "user-1", Username = "camille" };

    /// <summary>
    /// A restaurant rated several times counts once.
    /// </summary>
    [Fact]
    public void From_RestaurantRatedTwice_CountsDistinctRestaurants()
    {
        UserProfileResponse response = UserProfileResponse.From(SampleProfile, ["r1", "r2", "r1", "r3", "r2"]);

        Assert.Equal(3, response.RatedRestaurantsCount);
    }

    /// <summary>
    /// A user who never rated has rated 0 restaurants.
    /// </summary>
    [Fact]
    public void From_NoRating_CountsZero()
    {
        Assert.Equal(0, UserProfileResponse.From(SampleProfile, []).RatedRestaurantsCount);
    }

    /// <summary>
    /// The id, user name and avatar of the profile are returned.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesUsernameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", AvatarUrl = "https://img.test/c.png" };

        UserProfileResponse response = UserProfileResponse.From(profile, []);

        Assert.Equal("user-1", response.Id);
        Assert.Equal("camille", response.Name);
        Assert.Equal("https://img.test/c.png", response.AvatarUrl);
    }

    /// <summary>
    /// A profile without picture has no avatar.
    /// </summary>
    [Fact]
    public void From_NoAvatar_HasNoAvatar()
    {
        Assert.Null(UserProfileResponse.From(SampleProfile, []).AvatarUrl);
    }
}
