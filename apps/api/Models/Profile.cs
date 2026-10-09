using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// Public information about a user, stored in the "profiles" table (one row per Supabase Auth user, same id).
/// </summary>
[Table("profiles")]
public class Profile : BaseModel
{
    /// <summary>
    /// Supabase Auth identifier of the user.
    /// </summary>
    [PrimaryKey("id", true)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Unique user name, when the user chose one.
    /// </summary>
    [Column("username")]
    public string? Username { get; set; }

    /// <summary>
    /// Full name, when the user gave it.
    /// </summary>
    [Column("full_name")]
    public string? FullName { get; set; }

    /// <summary>
    /// URL of the profile picture, when the user uploaded one.
    /// </summary>
    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }
}
