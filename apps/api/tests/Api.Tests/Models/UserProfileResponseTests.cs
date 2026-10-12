using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the profile returned for a user: displayed name, avatar and number of restaurants rated.
/// </summary>
public class UserProfileResponseTests
{
    /// <summary>
    /// A restaurant rated several times counts once.
    /// </summary>
    [Fact]
    public void From_RestaurantRatedTwice_CountsDistinctRestaurants()
    {
        UserProfileResponse response = UserProfileResponse.From("user-1", null, ["r1", "r2", "r1", "r3", "r2"]);

        Assert.Equal(3, response.RatedRestaurantsCount);
    }

    /// <summary>
    /// A user who never rated has rated 0 restaurants.
    /// </summary>
    [Fact]
    public void From_NoRating_CountsZero()
    {
        Assert.Equal(0, UserProfileResponse.From("user-1", null, []).RatedRestaurantsCount);
    }

    /// <summary>
    /// The id, user name and avatar of the profile are returned.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesUsernameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", AvatarUrl = "https://img.test/c.png" };

        UserProfileResponse response = UserProfileResponse.From("user-1", profile, []);

        Assert.Equal("user-1", response.Id);
        Assert.Equal("camille", response.Name);
        Assert.Equal("https://img.test/c.png", response.AvatarUrl);
    }

    /// <summary>
    /// Without user name or profile, the user is anonymous.
    /// </summary>
    [Fact]
    public void From_NoUsername_IsAnonymous()
    {
        Assert.Equal(Profile.AnonymousName, UserProfileResponse.From("user-1", new Profile { Username = " " }, []).Name);
        Assert.Equal(Profile.AnonymousName, UserProfileResponse.From("user-1", new Profile(), []).Name);
        Assert.Equal(Profile.AnonymousName, UserProfileResponse.From("user-1", null, []).Name);
        Assert.Null(UserProfileResponse.From("user-1", null, []).AvatarUrl);
    }
}
