using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// A user's rating of a restaurant, stored in the "rating" table (primary key: restaurant, user, date). A user rates at
/// most one restaurant per day, which the API checks (see <see cref="RatingAllowanceResponse"/>). Only the latest rating
/// of a user for a restaurant is active (it is the user's score for the restaurant, flagged in the "is_active" column);
/// the previous ones are kept as history.
/// </summary>
[Table("rating")]
public class Rating : BaseModel
{
    /// <summary>
    /// Lowest score of a criterion.
    /// </summary>
    public const int MinScore = 1;

    /// <summary>
    /// Highest score of a criterion.
    /// </summary>
    public const int MaxScore = 10;

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
    /// Moment of the rating ("timestamptz" column). Part of the primary key: a row is written back with the exact
    /// moment read from the database.
    /// </summary>
    [PrimaryKey("date", true)]
    public DateTimeOffset Date { get; set; }

    /// <summary>
    /// Food rating, whole number from <see cref="MinScore"/> to <see cref="MaxScore"/>.
    /// </summary>
    [Column("food_rating")]
    public int FoodRating { get; set; }

    /// <summary>
    /// Service rating, whole number from <see cref="MinScore"/> to <see cref="MaxScore"/>.
    /// </summary>
    [Column("service_rating")]
    public int ServiceRating { get; set; }

    /// <summary>
    /// Setting (decor) rating, whole number from <see cref="MinScore"/> to <see cref="MaxScore"/>.
    /// </summary>
    [Column("setting_rating")]
    public int SettingRating { get; set; }

    /// <summary>
    /// "Instant crush": favorite bonus added to the global score, with no real criterion.
    /// </summary>
    [Column("bonus")]
    public bool Bonus { get; set; }

    /// <summary>
    /// True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones.
    /// Maintained by the API when a rating is created (see <see cref="PlanNew"/>) or deleted (see
    /// <see cref="PlanDeletion"/>).
    /// </summary>
    [Column("is_active")]
    public bool IsActive { get; set; }

    /// <summary>
    /// Plans the rows to write so that <paramref name="newRating"/> becomes the active rating of its user for its
    /// restaurant. Writing them in a single upsert keeps exactly one active rating, as the request is one transaction.
    /// </summary>
    /// <param name="currentActive">Active ratings of the same restaurant and user, as read before writing (normally
    /// zero or one; every one of them is deactivated).</param>
    /// <param name="newRating">Rating being created, once <see cref="RatingAllowanceResponse"/> allows it.</param>
    /// <returns>The previous active ratings, deactivated, then <paramref name="newRating"/>, active.</returns>
    public static IReadOnlyList<Rating> PlanNew(IReadOnlyList<Rating> currentActive, Rating newRating)
    {
        List<Rating> rows = currentActive.Select(r => r.WithIsActive(false)).ToList();
        rows.Add(newRating.WithIsActive(true));
        return rows;
    }

    /// <summary>
    /// Plans the deletion of the rating of <paramref name="date"/>: when it is the active one, the most recent of the
    /// others becomes active, so the user's score for the restaurant goes back to their previous rating.
    /// </summary>
    /// <param name="ratings">Every rating of the same restaurant and user, as read before deleting.</param>
    /// <param name="date">Moment of the rating to delete; the same instant in another time zone matches it.</param>
    /// <returns>The plan, or null when none of <paramref name="ratings"/> was given at <paramref name="date"/>.</returns>
    public static RatingDeletion? PlanDeletion(IReadOnlyList<Rating> ratings, DateTimeOffset date)
    {
        Rating? deleted = ratings.FirstOrDefault(r => r.Date == date);
        if (deleted is null)
            return null;

        List<Rating> remaining = ratings.Where(r => r != deleted).OrderByDescending(r => r.Date).ToList();
        // A deleted inactive rating leaves the active one as it is; so does a deleted active one when another is still
        // active (data not written by the API)
        Rating? activated = deleted.IsActive && remaining.Count > 0 && !remaining.Any(r => r.IsActive)
            ? remaining[0].WithIsActive(true)
            : null;
        if (activated is not null)
            remaining[0] = activated;
        return new RatingDeletion(deleted, activated, remaining);
    }

    /// <summary>
    /// Copies this rating with another active flag.
    /// </summary>
    private Rating WithIsActive(bool isActive) => new()
    {
        RestaurantId = RestaurantId,
        UserId = UserId,
        Date = Date,
        FoodRating = FoodRating,
        ServiceRating = ServiceRating,
        SettingRating = SettingRating,
        Bonus = Bonus,
        IsActive = isActive
    };
}
