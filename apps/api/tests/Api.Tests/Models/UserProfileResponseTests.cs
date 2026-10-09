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
    /// The id, full name and avatar of the profile are returned.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesFullNameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", FullName = "Camille Durand", Username = "camille", AvatarUrl = "https://img.test/c.png" };

        UserProfileResponse response = UserProfileResponse.From("user-1", profile, []);

        Assert.Equal("user-1", response.Id);
        Assert.Equal("Camille Durand", response.Name);
        Assert.Equal("https://img.test/c.png", response.AvatarUrl);
    }

    /// <summary>
    /// Without full name, the user name is displayed; without any name or profile, the user is anonymous.
    /// </summary>
    [Fact]
    public void From_MissingNames_FallsBack()
    {
        Assert.Equal("camille", UserProfileResponse.From("user-1", new Profile { Username = "camille" }, []).Name);
        Assert.Equal(Profile.AnonymousName, UserProfileResponse.From("user-1", new Profile { FullName = " " }, []).Name);
        Assert.Equal(Profile.AnonymousName, UserProfileResponse.From("user-1", null, []).Name);
        Assert.Null(UserProfileResponse.From("user-1", null, []).AvatarUrl);
    }
}
