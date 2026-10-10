namespace api.Models;

/// <summary>
/// Averages of a restaurant's active ratings (each user's latest), returned by GET /api/restaurants/{id}/ratings/summary.
/// The averages are null when the restaurant has no active rating.
/// </summary>
/// <param name="Count">Number of active ratings averaged.</param>
/// <param name="Food">Average food rating, from 0 to 100.</param>
/// <param name="Service">Average service rating, from 0 to 100.</param>
/// <param name="Setting">Average setting (decor) rating, from 0 to 100.</param>
/// <param name="Global">Average of every criterion of every active rating, from 0 to 100 (the "instant crush" bonus is
/// not included).</param>
public record RatingSummaryResponse(int Count, float? Food, float? Service, float? Setting, float? Global)
{
    /// <summary>
    /// Averages the active ratings among <paramref name="ratings"/>.
    /// </summary>
    /// <param name="ratings">Ratings of one restaurant; the inactive ones (previous ratings, kept as history) are ignored.</param>
    /// <returns>The number of active ratings and their averages, null averages when there is none.</returns>
    public static RatingSummaryResponse From(IEnumerable<Rating> ratings)
    {
        List<Rating> active = ratings.Where(r => r.IsActive).ToList();
        if (active.Count == 0)
            return new RatingSummaryResponse(0, null, null, null, null);

        float food = active.Average(r => r.FoodRating);
        float service = active.Average(r => r.ServiceRating);
        float setting = active.Average(r => r.SettingRating);
        // Each rating has the three criteria: the average of all criteria is the average of the three averages
        return new RatingSummaryResponse(active.Count, food, service, setting, (food + service + setting) / 3);
    }
}
