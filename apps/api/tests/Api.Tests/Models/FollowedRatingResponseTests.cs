using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the mapping of a rating of a user followed, its restaurant and its author's profile to the API response.
/// </summary>
public class FollowedRatingResponseTests
{
    /// <summary>
    /// Rating mapped in every test.
    /// </summary>
    private static readonly Rating SampleRating = new()
    {
        RestaurantId = "r1",
        UserId = "user-1",
        // 20:15 in Paris (UTC+2)
        Date = new DateTimeOffset(2026, 3, 7, 20, 15, 0, TimeSpan.FromHours(2)),
        FoodRating = 80.5f,
        ServiceRating = 60,
        SettingRating = 40,
        Bonus = true,
        IsActive = true
    };

    /// <summary>
    /// Restaurant of <see cref="SampleRating"/>.
    /// </summary>
    private static readonly Restaurant SampleRestaurant = new() { Id = "r1", Name = "Chez Paul", Emoji = "🍝", Address = "1 rue de Lyon" };

    /// <summary>
    /// Profile of the author of <see cref="SampleRating"/>.
    /// </summary>
    private static readonly Profile SampleProfile = new() { Id = "user-1", Username = "camille" };

    /// <summary>
    /// The scores, the bonus and the ids are copied, the restaurant's name and emoji are added, and the moment is sent
    /// in UTC.
    /// </summary>
    [Fact]
    public void From_Rating_CopiesScoresAndRestaurantAndSendsMomentInUtc()
    {
        FollowedRatingResponse response = FollowedRatingResponse.From(SampleRating, SampleRestaurant, SampleProfile);

        Assert.Equal("r1", response.RestaurantId);
        Assert.Equal("Chez Paul", response.RestaurantName);
        Assert.Equal("🍝", response.RestaurantEmoji);
        Assert.Equal("user-1", response.UserId);
        Assert.Equal(new DateTimeOffset(2026, 3, 7, 18, 15, 0, TimeSpan.Zero), response.Date);
        Assert.Equal(TimeSpan.Zero, response.Date.Offset);
        Assert.Equal(80.5f, response.Food);
        Assert.Equal(60, response.Service);
        Assert.Equal(40, response.Setting);
        Assert.True(response.Bonus);
        Assert.True(response.IsActive);
    }

    /// <summary>
    /// A previous rating, replaced by a more recent one, is sent as inactive.
    /// </summary>
    [Fact]
    public void From_PreviousRating_IsInactive()
    {
        Rating previous = new() { RestaurantId = "r1", UserId = "user-1", Date = new DateTimeOffset(2026, 3, 1, 12, 0, 0, TimeSpan.Zero), IsActive = false };

        Assert.False(FollowedRatingResponse.From(previous, SampleRestaurant, SampleProfile).IsActive);
    }

    /// <summary>
    /// The author's display name is displayed, and the avatar is passed along.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesDisplayNameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "camille", DisplayName = "Camille D.", AvatarUrl = "https://img.test/c.png" };

        FollowedRatingResponse response = FollowedRatingResponse.From(SampleRating, SampleRestaurant, profile);

        Assert.Equal("Camille D.", response.UserName);
        Assert.Equal("https://img.test/c.png", response.UserAvatarUrl);
    }

    /// <summary>
    /// Without a display name, the author's username is displayed.
    /// </summary>
    [Fact]
    public void From_NoDisplayName_UsesUsername()
    {
        Assert.Equal("camille", FollowedRatingResponse.From(SampleRating, SampleRestaurant, SampleProfile).UserName);
    }
}
