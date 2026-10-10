using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// A restaurant added to a tierlist, stored in the "tierlist_restaurant" table (primary key: tierlist, restaurant).
/// Only a restaurant the tierlist's owner rated can be added: the tierlist ranks restaurants by the owner's ratings.
/// </summary>
[Table("tierlist_restaurant")]
public class TierlistRestaurant : BaseModel
{
    /// <summary>
    /// Database identifier of the tierlist.
    /// </summary>
    [PrimaryKey("id_tierlist", true)]
    public long TierlistId { get; set; }

    /// <summary>
    /// Database identifier of the restaurant.
    /// </summary>
    [PrimaryKey("id_restaurant", true)]
    public string RestaurantId { get; set; } = string.Empty;

    /// <summary>
    /// When the restaurant was added to the tierlist, null when unknown.
    /// </summary>
    [Column("added_at")]
    public DateTime? AddedAt { get; set; }
}
