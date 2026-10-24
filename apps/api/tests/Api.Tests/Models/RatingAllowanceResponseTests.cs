using api.Common;
using api.Models;

namespace Api.Tests.Models;

/// <summary>
/// Tests the "one restaurant per day" rule: a user rates at most one restaurant per day (UTC).
/// </summary>
public class RatingAllowanceResponseTests
{
    /// <summary>
    /// March <paramref name="day"/> 2026 at <paramref name="hour"/>:<paramref name="minute"/> UTC.
    /// </summary>
    private static DateTimeOffset March(int day, int hour = 12, int minute = 0) => new(2026, 3, day, hour, minute, 0, TimeSpan.Zero);

    /// <summary>
    /// A user who never rated can rate.
    /// </summary>
    [Fact]
    public void From_NeverRated_CanRate()
    {
        Assert.Equal(new RatingAllowanceResponse(true, null), RatingAllowanceResponse.From(null, March(9)));
    }

    /// <summary>
    /// A user whose latest rating is from a previous day can rate.
    /// </summary>
    [Fact]
    public void From_RatedAPreviousDay_CanRate()
    {
        Assert.Equal(new RatingAllowanceResponse(true, null), RatingAllowanceResponse.From(March(8, hour: 21), March(9, hour: 8)));
    }

    /// <summary>
    /// A user who already rated earlier the same day, even hours before, cannot rate again until the next midnight UTC.
    /// </summary>
    [Fact]
    public void From_RatedEarlierToday_CannotRateUntilMidnightUtc()
    {
        RatingAllowanceResponse allowance = RatingAllowanceResponse.From(March(9, hour: 8), March(9, hour: 21));

        Assert.Equal(new RatingAllowanceResponse(false, March(10, hour: 0)), allowance);
    }

    /// <summary>
    /// The day is the UTC day: 23:30 then 00:10 UTC are two days, even where it is the same local day.
    /// </summary>
    [Fact]
    public void From_RatedTheUtcDayBefore_CanRate()
    {
        Assert.True(RatingAllowanceResponse.From(March(8, hour: 23, minute: 30), March(9, hour: 0, minute: 10)).CanRate);
    }

    /// <summary>
    /// The day is the UTC day whatever the offset of the moments: 23:15 then 00:30 in Paris (UTC+1) are two local days
    /// but the same UTC day (22:15 and 23:30 UTC), so the second rating waits for midnight UTC, sent in UTC.
    /// </summary>
    [Fact]
    public void From_MomentsWithOffset_UseTheUtcDay()
    {
        TimeSpan paris = TimeSpan.FromHours(1);

        RatingAllowanceResponse allowance = RatingAllowanceResponse.From(
            new DateTimeOffset(2026, 3, 8, 23, 15, 0, paris),
            new DateTimeOffset(2026, 3, 9, 0, 30, 0, paris));

        Assert.Equal(new RatingAllowanceResponse(false, March(9, hour: 0)), allowance);
        Assert.Equal(TimeSpan.Zero, allowance.NextRatingAt!.Value.Offset);
    }

    /// <summary>
    /// The refusal is a 409, explaining the rule.
    /// </summary>
    [Fact]
    public void AlreadyRatedToday_IsAConflict()
    {
        Assert.Equal(ErrorType.Conflict, RatingAllowanceResponse.AlreadyRatedToday.Type);
        Assert.Equal("You already rated a restaurant today.", RatingAllowanceResponse.AlreadyRatedToday.Message);
    }
}
