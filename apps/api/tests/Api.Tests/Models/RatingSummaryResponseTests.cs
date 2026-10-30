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
    private static Rating Rating(int food, int service, int setting, bool isActive = true, bool bonus = false) => new()
    {
        RestaurantId = "r1",
        UserId = Guid.NewGuid().ToString(),
        Date = new DateTimeOffset(2026, 3, 7, 12, 0, 0, TimeSpan.Zero),
        FoodRating = food,
        ServiceRating = service,
        SettingRating = setting,
        Bonus = bonus,
        IsActive = isActive
    };

    /// <summary>
    /// Each criterion is averaged over the ratings, and the global score mixes every criterion of every rating. The
    /// criteria are whole numbers, their averages keep their decimals.
    /// </summary>
    [Fact]
    public void From_ActiveRatings_AveragesEachCriterionAndAll()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(9, 6, 3), Rating(7, 4, 2)]);

        Assert.Equal(2, summary.Count);
        Assert.Equal(8, summary.Food);
        Assert.Equal(5, summary.Service);
        Assert.Equal(2.5f, summary.Setting);
        // (9 + 6 + 3 + 7 + 4 + 2) / 6
        Assert.Equal(5.1666665f, summary.Global!.Value, 0.0001f);
    }

    /// <summary>
    /// Previous ratings, replaced by a more recent one of the same user, do not count.
    /// </summary>
    [Fact]
    public void From_InactiveRatings_AreIgnored()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(9, 9, 9), Rating(1, 1, 1, isActive: false)]);

        Assert.Equal(1, summary.Count);
        Assert.Equal(9, summary.Global);
    }

    /// <summary>
    /// The "instant crush" bonus is not a criterion: it does not change the global score.
    /// </summary>
    [Fact]
    public void From_Bonus_DoesNotChangeGlobal()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(6, 6, 6, bonus: true)]);

        Assert.Equal(6, summary.Global);
    }

    /// <summary>
    /// Without active rating, there is nothing to average: the averages are null rather than 0.
    /// </summary>
    [Fact]
    public void From_NoActiveRating_ReturnsNullAverages()
    {
        RatingSummaryResponse summary = RatingSummaryResponse.From([Rating(9, 9, 9, isActive: false)]);

        Assert.Equal(new RatingSummaryResponse(0, null, null, null, null), summary);
    }
}
