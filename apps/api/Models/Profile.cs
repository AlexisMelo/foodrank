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
    /// Unique username chosen when signing up, which cannot be changed (see <see cref="Common.UsernameAttribute"/>).
    /// </summary>
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Name the user chose to be shown instead of their username; null until they choose one (never at sign up).
    /// </summary>
    [Column("display_name")]
    public string? DisplayName { get; set; }

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

    /// <summary>
    /// Display name of the user owning <paramref name="profile"/>.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <returns>The display name, null when there is none (or a blank one).</returns>
    public static string? DisplayNameOrNull(Profile profile)
        => string.IsNullOrWhiteSpace(profile.DisplayName) ? null : profile.DisplayName;

    /// <summary>
    /// Name shown for the user owning <paramref name="profile"/> where there is room for a single name.
    /// </summary>
    /// <param name="profile">Profile row of the user.</param>
    /// <returns>The display name, or the username when there is none.</returns>
    public static string DisplayedName(Profile profile) => DisplayNameOrNull(profile) ?? profile.Username;
}
