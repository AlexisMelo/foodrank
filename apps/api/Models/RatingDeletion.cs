namespace api.Models;

/// <summary>
/// What deleting one rating of a user for a restaurant writes, planned by <see cref="Rating.PlanDeletion"/>.
/// </summary>
/// <param name="Deleted">Rating to delete, as read from the database.</param>
/// <param name="Activated">Previous rating that becomes the active one, to write back; null when the rating deleted was
/// not the active one, or was the only one.</param>
/// <param name="Remaining">Ratings of the user for the restaurant once the deletion is done, the activated one included,
/// most recent first; empty when the rating deleted was the only one.</param>
public record RatingDeletion(Rating Deleted, Rating? Activated, IReadOnlyList<Rating> Remaining);
