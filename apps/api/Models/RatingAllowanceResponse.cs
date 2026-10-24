using api.Common;

namespace api.Models;

/// <summary>
/// Whether the logged-in user can rate a restaurant now, returned by GET /api/users/me/rating-allowance. A user rates at
/// most one restaurant per day (UTC), as they can visit only one restaurant a day; the API refuses any other rating of
/// the day with <see cref="AlreadyRatedToday"/>.
/// </summary>
/// <param name="CanRate">True when the user has not rated any restaurant today (UTC).</param>
/// <param name="NextRatingAt">Moment the user can rate again (the next midnight UTC); null when
/// <paramref name="CanRate"/> is true.</param>
public record RatingAllowanceResponse(bool CanRate, DateTimeOffset? NextRatingAt)
{
    /// <summary>
    /// Error returned when the user tries to rate a restaurant after already rating one the same day.
    /// </summary>
    public static Error AlreadyRatedToday { get; } = new(ErrorType.Conflict, "You already rated a restaurant today.");

    /// <summary>
    /// Applies the "one restaurant per day" rule to the user's latest rating.
    /// </summary>
    /// <param name="lastRatingDate">Moment of the user's most recent rating, whatever the restaurant; null when they
    /// never rated.</param>
    /// <param name="now">Current moment.</param>
    /// <returns>Allowed when the latest rating is from a previous UTC day; otherwise refused until the next midnight UTC.</returns>
    public static RatingAllowanceResponse From(DateTimeOffset? lastRatingDate, DateTimeOffset now)
    {
        DateTimeOffset startOfToday = new(now.UtcDateTime.Date, TimeSpan.Zero);
        return lastRatingDate >= startOfToday
            ? new RatingAllowanceResponse(false, startOfToday.AddDays(1))
            : new RatingAllowanceResponse(true, null);
    }
}
