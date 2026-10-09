using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a rating and its author's profile to the API response.
/// </summary>
public class RatingResponseTests
{
    /// <summary>
    /// Rating mapped in every test.
    /// </summary>
    private static readonly Rating SampleRating = new()
    {
        RestaurantId = "r1",
        UserId = "user-1",
        Date = new DateTime(2026, 3, 7),
        FoodRating = 80.5f,
        ServiceRating = 60,
        SettingRating = 40,
        Bonus = true
    };

    /// <summary>
    /// The scores, the bonus and the ids are copied, and the date is sent without time.
    /// </summary>
    [Fact]
    public void From_Rating_CopiesScoresAndFormatsDate()
    {
        RatingResponse response = RatingResponse.From(SampleRating, null);

        Assert.Equal("r1", response.RestaurantId);
        Assert.Equal("user-1", response.UserId);
        Assert.Equal("2026-03-07", response.Date);
        Assert.Equal(80.5f, response.Food);
        Assert.Equal(60, response.Service);
        Assert.Equal(40, response.Setting);
        Assert.True(response.Bonus);
    }

    /// <summary>
    /// The full name is preferred over the user name, and the avatar is passed along.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesFullNameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", FullName = "Alex Dupont", Username = "alex", AvatarUrl = "https://img.test/a.png" };

        RatingResponse response = RatingResponse.From(SampleRating, profile);

        Assert.Equal("Alex Dupont", response.UserName);
        Assert.Equal("https://img.test/a.png", response.UserAvatarUrl);
    }

    /// <summary>
    /// Without a full name, the user name is displayed.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void From_NoFullName_UsesUsername(string? fullName)
    {
        Profile profile = new() { Id = "user-1", FullName = fullName, Username = "alex" };

        Assert.Equal("alex", RatingResponse.From(SampleRating, profile).UserName);
    }

    /// <summary>
    /// A profile with no name, or no profile at all, is shown as anonymous without avatar.
    /// </summary>
    [Fact]
    public void From_NoName_IsAnonymous()
    {
        RatingResponse withEmptyProfile = RatingResponse.From(SampleRating, new Profile { Id = "user-1", AvatarUrl = "" });
        RatingResponse withoutProfile = RatingResponse.From(SampleRating, null);

        Assert.Equal(RatingResponse.AnonymousUserName, withEmptyProfile.UserName);
        Assert.Null(withEmptyProfile.UserAvatarUrl);
        Assert.Equal(RatingResponse.AnonymousUserName, withoutProfile.UserName);
        Assert.Null(withoutProfile.UserAvatarUrl);
    }
}
