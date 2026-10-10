namespace api.Models;

/// <summary>
/// A tierlist returned by the /api/tierlists and /api/users/{id}/tierlists endpoints, with its restaurants.
/// </summary>
/// <param name="Id">Database identifier of the tierlist.</param>
/// <param name="UserId">Supabase Auth identifier of the user who created it.</param>
/// <param name="Name">Name of the tierlist.</param>
/// <param name="Description">Description, null when there is none.</param>
/// <param name="Emoji">Emoji used as the tierlist picture.</param>
/// <param name="Pinned">True when the tierlist is pinned to the user's profile.</param>
/// <param name="CreatedAt">Creation date, set by the database.</param>
/// <param name="UpdatedAt">Last time a restaurant was added, or the creation date when none was added since.</param>
/// <param name="Restaurants">Restaurants of the tierlist, in the order they were added.</param>
public record TierlistResponse(
    long Id,
    string UserId,
    string Name,
    string? Description,
    string Emoji,
    bool Pinned,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<TierlistEntryResponse> Restaurants)
{
    /// <summary>
    /// Maps a tierlist row and its restaurant rows to the API response.
    /// </summary>
    /// <param name="tierlist">Tierlist row; its null columns are returned as empty strings, and as not pinned.</param>
    /// <param name="restaurants">Rows of "tierlist_restaurant" belonging to the tierlist.</param>
    /// <returns>The tierlist with its restaurants, the oldest added first.</returns>
    public static TierlistResponse From(Tierlist tierlist, IEnumerable<TierlistRestaurant> restaurants)
    {
        List<TierlistEntryResponse> entries = restaurants
            .OrderBy(r => r.AddedAt)
            .Select(r => new TierlistEntryResponse(r.RestaurantId, r.AddedAt))
            .ToList();
        // No "updated_at" column: the tierlist changes when a restaurant is added to it
        DateTime updatedAt = entries
            .Select(e => e.AddedAt)
            .OfType<DateTime>()
            .Append(tierlist.CreatedAt)
            .Max();

        return new TierlistResponse(
            tierlist.Id,
            tierlist.UserId ?? string.Empty,
            tierlist.Name ?? string.Empty,
            tierlist.Description,
            tierlist.Emoji ?? string.Empty,
            tierlist.Pinned ?? false,
            tierlist.CreatedAt,
            updatedAt,
            entries);
    }
}

/// <summary>
/// A restaurant of a tierlist, in <see cref="TierlistResponse.Restaurants"/>.
/// </summary>
/// <param name="RestaurantId">Database identifier of the restaurant.</param>
/// <param name="AddedAt">When it was added to the tierlist, null when unknown.</param>
public record TierlistEntryResponse(string RestaurantId, DateTime? AddedAt);
