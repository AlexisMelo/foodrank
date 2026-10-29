using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace api.Models;

/// <summary>
/// A user following another one, stored in the "follow" table (primary key: follower, followed). There is no request
/// to accept: following is one-way, and the other user can follow back. A user cannot follow themselves (checked by the
/// API and by a database constraint).
/// </summary>
[Table("follow")]
public class Follow : BaseModel
{
    /// <summary>
    /// Supabase Auth identifier of the user who follows.
    /// </summary>
    [PrimaryKey("id_follower", true)]
    public string FollowerId { get; set; } = string.Empty;

    /// <summary>
    /// Supabase Auth identifier of the user followed.
    /// </summary>
    [PrimaryKey("id_followed", true)]
    public string FollowedId { get; set; } = string.Empty;

    /// <summary>
    /// When the follow started, set by the database on insert (never sent by the API).
    /// </summary>
    [Column("created_at", ignoreOnInsert: true, ignoreOnUpdate: true)]
    public DateTime CreatedAt { get; set; }
}
