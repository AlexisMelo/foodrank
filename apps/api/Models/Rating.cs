using System.Globalization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// A user's rating of a restaurant, stored in the "rating" table. A user can rate a restaurant at most once per day
/// (primary key: restaurant, user, date).
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
    /// Formats a rating day for API responses.
    /// </summary>
    /// <param name="date">Day of the rating (its time is ignored).</param>
    /// <returns>The day as "yyyy-MM-dd", without time nor time zone.</returns>
    public static string FormatDate(DateTime date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
