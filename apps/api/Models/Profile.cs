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

    /// <summary>
    /// Name displayed when the user has no profile, or neither a full name nor a user name.
    /// </summary>
    public const string AnonymousName = "Anonymous";

    /// <summary>
    /// Name displayed for the user owning <paramref name="profile"/>.
    /// </summary>
    /// <param name="profile">Profile row of the user, null when the user has none.</param>
    /// <returns>The full name, then the user name, then <see cref="AnonymousName"/>.</returns>
    public static string DisplayName(Profile? profile)
        => new[] { profile?.FullName, profile?.Username }.FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
            ?? AnonymousName;

    /// <summary>
    /// Profile picture of the user owning <paramref name="profile"/>.
    /// </summary>
    /// <param name="profile">Profile row of the user, null when the user has none.</param>
    /// <returns>The avatar url, null when there is none (no profile, or a blank url).</returns>
    public static string? AvatarUrlOrNull(Profile? profile)
        => string.IsNullOrWhiteSpace(profile?.AvatarUrl) ? null : profile.AvatarUrl;
}
