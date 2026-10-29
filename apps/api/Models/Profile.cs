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
    /// Unique pseudonym, the name displayed for the user, chosen when signing up.
    /// </summary>
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// URL of the profile picture, when the user uploaded one.
    /// </summary>
    [Column("avatar_url")]
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Year of birth, computed from the age given when signing up; null for older accounts.
    /// </summary>
    [Column("birth_year")]
    public int? BirthYear { get; set; }

    /// <summary>
    /// Identity chosen when signing up, one of <see cref="Identities"/>; null for older accounts.
    /// </summary>
    [Column("identity")]
    public string? Identity { get; set; }

    /// <summary>
    /// Profile picture of the user owning <paramref name="profile"/>.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <returns>The avatar url, null when there is none (or a blank url).</returns>
    public static string? AvatarUrlOrNull(Profile profile)
        => string.IsNullOrWhiteSpace(profile.AvatarUrl) ? null : profile.AvatarUrl;
}
