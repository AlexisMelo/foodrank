using api.Common;
using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the rows written when a rating is created: the new rating becomes the active one and the previous one is
/// deactivated, so only the latest rating of a user for a restaurant counts as their score.
/// </summary>
public class RatingTests
{
    /// <summary>
    /// Builds a rating of restaurant "r1" by "user-1" on March <paramref name="day"/>.
    /// </summary>
    private static Rating NewRating(int day, bool isActive = false, float food = 50) => new()
    {
        RestaurantId = "r1",
        UserId = "user-1",
        Date = new DateTime(2026, 3, day),
        FoodRating = food,
        IsActive = isActive
    };

    /// <summary>
    /// The first rating of a restaurant is written alone, active.
    /// </summary>
    [Fact]
    public void PlanNew_FirstRating_WritesItActive()
    {
        Result<IReadOnlyList<Rating>> rows = Rating.PlanNew([], NewRating(9));

        Rating row = Assert.Single(rows.Value!);
        Assert.Equal(new DateTime(2026, 3, 9), row.Date);
        Assert.True(row.IsActive);
    }

    /// <summary>
    /// The previous active rating is written back deactivated, with its scores unchanged, before the new active one.
    /// </summary>
    [Fact]
    public void PlanNew_PreviousActiveRating_DeactivatesItAndActivatesNewOne()
    {
        Result<IReadOnlyList<Rating>> rows = Rating.PlanNew([NewRating(1, isActive: true, food: 20)], NewRating(9, food: 90));

        Assert.True(rows.IsSuccess);
        Assert.Equal(
            [(new DateTime(2026, 3, 1), 20f, false), (new DateTime(2026, 3, 9), 90f, true)],
            rows.Value!.Select(r => (r.Date, r.FoodRating, r.IsActive)));
        Assert.All(rows.Value!, r => Assert.Equal(DateTimeKind.Unspecified, r.Date.Kind));
    }

    /// <summary>
    /// Several active ratings (data written outside the app) are all deactivated, leaving only the new one active.
    /// </summary>
    [Fact]
    public void PlanNew_SeveralActiveRatings_DeactivatesThemAll()
    {
        Result<IReadOnlyList<Rating>> rows = Rating.PlanNew([NewRating(1, isActive: true), NewRating(5, isActive: true)], NewRating(9));

        Assert.Equal([false, false, true], rows.Value!.Select(r => r.IsActive));
    }

    /// <summary>
    /// A second rating the same day is refused rather than written over the first one.
    /// </summary>
    [Fact]
    public void PlanNew_AlreadyRatedThatDay_FailsWithConflict()
    {
        Result<IReadOnlyList<Rating>> rows = Rating.PlanNew([NewRating(9, isActive: true)], NewRating(9));

        Assert.False(rows.IsSuccess);
        Assert.Equal(ErrorType.Conflict, rows.Error!.Type);
    }
}
