using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the averages of a restaurant's ratings sent to its page.
/// </summary>
public class RatingSummaryResponseTests
{
    /// <summary>
    /// Builds a rating with the given scores, active unless <paramref name="isActive"/> is false.
    /// </summary>
    private static Rating Rating(float food, float service, float setting, bool isActive = true, bool bonus = false) => new()
    {
        RestaurantId = "r1",
        UserId = Guid.NewGuid().ToString(),
        Date = new DateTime(2026, 3, 7),
        FoodRating = food,
        ServiceRating = service,
        SettingRating = setting,
        Bonus = bonus,
        IsActive = isActive
    };

    /// <summary>
    /// Each criterion is averaged over the ratings, and the global score mixes every criterion of every rating.
    /// </summary>
    [Fact]
    public void From_ActiveRatings_AveragesEachCriterionAndAll()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(90, 60, 30), Rating(70, 40, 20)]);

        Assert.Equal(2, summary.Count);
        Assert.Equal(80, summary.Food);
        Assert.Equal(50, summary.Service);
        Assert.Equal(25, summary.Setting);
        // (90 + 60 + 30 + 70 + 40 + 20) / 6
        Assert.Equal(51.666668f, summary.Global!.Value, 0.0001f);
    }

    /// <summary>
    /// Previous ratings, replaced by a more recent one of the same user, do not count.
    /// </summary>
    [Fact]
    public void From_InactiveRatings_AreIgnored()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(90, 90, 90), Rating(0, 0, 0, isActive: false)]);

        Assert.Equal(1, summary.Count);
        Assert.Equal(90, summary.Global);
    }

    /// <summary>
    /// The "instant crush" bonus is not a criterion: it does not change the global score.
    /// </summary>
    [Fact]
    public void From_Bonus_DoesNotChangeGlobal()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(60, 60, 60, bonus: true)]);

        Assert.Equal(60, summary.Global);
    }

    /// <summary>
    /// Without active rating, there is nothing to average: the averages are null rather than 0.
    /// </summary>
    [Fact]
    public void From_NoActiveRating_ReturnsNullAverages()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(90, 90, 90, isActive: false)]);

        Assert.Equal(new RatingSummaryResponse(0, null, null, null, null), summary);
    }
}
