using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

[Table("restaurants")]
public class Restaurant : BaseModel
{
    [PrimaryKey("id", false)]
    public string Id { get; set; } = string.Empty;

    [Column("osm_id")]
    public string OsmId { get; set; } = string.Empty;

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("cuisine")]
    public string Cuisine { get; set; } = string.Empty;

    [Column("emoji")]
    public string Emoji { get; set; } = string.Empty;

    [Column("address")]
    public string Address { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("lat")]
    public double? Lat { get; set; }

    [Column("lng")]
    public double? Lng { get; set; }
}
