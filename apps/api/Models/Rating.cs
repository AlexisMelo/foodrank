using System.Globalization;
using api.Common;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// A user's rating of a restaurant, stored in the "rating" table. A user can rate a restaurant at most once per day
/// (primary key: restaurant, user, date). Only the latest rating of a user for a restaurant is active (it is the
/// user's score for the restaurant, flagged in the "is_active" column); the previous ones are kept as history.
/// </summary>
[Table("rating")]
public class Rating : BaseModel
{
    /// <summary>
    /// Database identifier of the rated restaurant.
    /// </summary>
    [PrimaryKey("id_restaurant", true)]
    public string RestaurantId { get; set; } = string.Empty;

    /// <summary>
    /// Supabase Auth identifier of the user who rated.
    /// </summary>
    [PrimaryKey("id_user", true)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Day of the rating (UTC), without time.
    /// </summary>
    [PrimaryKey("date", true)]
    public DateTime Date { get; set; }

    /// <summary>
    /// Food rating, from 0 to 100.
    /// </summary>
    [Column("food_rating")]
    public float FoodRating { get; set; }

    /// <summary>
    /// Service rating, from 0 to 100.
    /// </summary>
    [Column("service_rating")]
    public float ServiceRating { get; set; }

    /// <summary>
    /// Setting (decor) rating, from 0 to 100.
    /// </summary>
    [Column("setting_rating")]
    public float SettingRating { get; set; }

    /// <summary>
    /// "Instant crush": favorite bonus added to the global score, with no real criterion.
    /// </summary>
    [Column("bonus")]
    public bool Bonus { get; set; }

    /// <summary>
    /// True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones.
    /// Maintained by the API when a rating is created (see <see cref="PlanNew"/>).
    /// </summary>
    [Column("is_active")]
    public bool IsActive { get; set; }

    /// <summary>
    /// Formats a rating day for API responses.
    /// </summary>
    /// <param name="date">Day of the rating (its time is ignored).</param>
    /// <returns>The day as "yyyy-MM-dd", without time nor time zone.</returns>
    public static string FormatDate(DateTime date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    /// <summary>
    /// Plans the rows to write so that <paramref name="newRating"/> becomes the active rating of its user for its
    /// restaurant. Writing them in a single upsert keeps exactly one active rating, as the request is one transaction.
    /// </summary>
    /// <param name="currentActive">Active ratings of the same restaurant and user, as read before writing (normally
    /// zero or one; every one of them is deactivated).</param>
    /// <param name="newRating">Rating being created.</param>
    /// <returns>The previous active ratings, deactivated, then <paramref name="newRating"/>, active; or a Conflict
    /// failure when the user already rated the restaurant that day.</returns>
    public static Result<IReadOnlyList<Rating>> PlanNew(IReadOnlyList<Rating> currentActive, Rating newRating)
    {
        if (currentActive.Any(r => r.Date.Date == newRating.Date.Date))
            return Result<IReadOnlyList<Rating>>.Failure(new Error(ErrorType.Conflict, "You already rated this restaurant today."));

        List<Rating> rows = currentActive.Select(r => r.WithIsActive(false)).ToList();
        rows.Add(newRating.WithIsActive(true));
        return Result<IReadOnlyList<Rating>>.Success(rows);
    }

    /// <summary>
    /// Copies this rating with another active flag.
    /// </summary>
    private Rating WithIsActive(bool isActive) => new()
    {
        RestaurantId = RestaurantId,
        UserId = UserId,
        // Unspecified kind so the date is serialized without time zone ("2026-10-01T00:00:00") for the "date" column
        Date = DateTime.SpecifyKind(Date.Date, DateTimeKind.Unspecified),
        FoodRating = FoodRating,
        ServiceRating = ServiceRating,
        SettingRating = SettingRating,
        Bonus = Bonus,
        IsActive = isActive
    };
}
