namespace api.Models;

/// <summary>
/// A tierlist returned by POST /api/tierlists.
/// </summary>
/// <param name="Id">Database identifier of the tierlist.</param>
/// <param name="UserId">Supabase Auth identifier of the user who created it.</param>
/// <param name="Name">Name of the tierlist.</param>
/// <param name="Description">Description, null when there is none.</param>
/// <param name="Emoji">Emoji used as the tierlist picture.</param>
/// <param name="Pinned">True when the tierlist is pinned to the user's profile.</param>
/// <param name="CreatedAt">Creation date, set by the database.</param>
public record TierlistResponse(
    long Id,
    string UserId,
    string Name,
    string? Description,
    string Emoji,
    bool Pinned,
    DateTime CreatedAt)
{
    /// <summary>
    /// Maps a tierlist row to the API response.
    /// </summary>
    /// <param name="tierlist">Tierlist row.</param>
    /// <returns>The tierlist, without its restaurants.</returns>
    public static TierlistResponse From(Tierlist tierlist) => new(
        tierlist.Id,
        tierlist.UserId,
        tierlist.Name,
        tierlist.Description,
        tierlist.Emoji,
        tierlist.Pinned,
        tierlist.CreatedAt);
}
