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
        // 20:15 in Paris (UTC+2)
        Date = new DateTimeOffset(2026, 3, 7, 20, 15, 0, TimeSpan.FromHours(2)),
        FoodRating = 8,
        ServiceRating = 6,
        SettingRating = 4,
        Bonus = true,
        IsActive = true
    };

    /// <summary>
    /// Profile of the author of <see cref="SampleRating"/>.
    /// </summary>
    private static readonly Profile SampleProfile = new() { Id = "user-1", Username = "alex" };

    /// <summary>
    /// The scores, the bonus and the ids are copied, and the moment is sent in UTC.
    /// </summary>
    [Fact]
    public void From_Rating_CopiesScoresAndSendsMomentInUtc()
    {
        RatingResponse response = RatingResponse.From(SampleRating, SampleProfile);

        Assert.Equal("r1", response.RestaurantId);
        Assert.Equal("user-1", response.UserId);
        Assert.Equal(new DateTimeOffset(2026, 3, 7, 18, 15, 0, TimeSpan.Zero), response.Date);
        Assert.Equal(TimeSpan.Zero, response.Date.Offset);
        Assert.Equal(8, response.Food);
        Assert.Equal(6, response.Service);
        Assert.Equal(4, response.Setting);
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

        Assert.False(RatingResponse.From(previous, SampleProfile).IsActive);
    }

    /// <summary>
    /// The author's display name is displayed, and the avatar is passed along.
    /// </summary>
    [Fact]
    public void From_FullProfile_UsesDisplayNameAndAvatar()
    {
        Profile profile = new() { Id = "user-1", Username = "alex", DisplayName = "Alex M.", AvatarUrl = "https://img.test/a.png" };

        RatingResponse response = RatingResponse.From(SampleRating, profile);

        Assert.Equal("Alex M.", response.UserName);
        Assert.Equal("https://img.test/a.png", response.UserAvatarUrl);
    }

    /// <summary>
    /// Without a display name, the author's username is displayed.
    /// </summary>
    [Fact]
    public void From_NoDisplayName_UsesUsername()
    {
        Assert.Equal("alex", RatingResponse.From(SampleRating, SampleProfile).UserName);
    }
}
