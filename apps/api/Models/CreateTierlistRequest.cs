using System.ComponentModel.DataAnnotations;
using api.Common;

namespace api.Models;

/// <summary>
/// Body of POST /api/tierlists. Invalid values are rejected with a 400.
/// </summary>
/// <param name="Emoji">Emoji used as the tierlist picture: exactly one character.</param>
/// <param name="Name">Name of the tierlist, not blank, at most <see cref="NameMaxLength"/> characters.</param>
/// <param name="Description">Optional description, at most <see cref="DescriptionMaxLength"/> characters.</param>
/// <param name="Pinned">True to pin the tierlist to the user's profile.</param>
public record CreateTierlistRequest(
    [Required, SingleCharacter] string Emoji,
    [Required, StringLength(CreateTierlistRequest.NameMaxLength)] string Name,
    [StringLength(CreateTierlistRequest.DescriptionMaxLength)] string? Description,
    bool Pinned)
{
    /// <summary>
    /// Maximum length of <see cref="Name"/>.
    /// </summary>
    public const int NameMaxLength = 50;

    /// <summary>
    /// Maximum length of <see cref="Description"/>.
    /// </summary>
    public const int DescriptionMaxLength = 200;

    /// <summary>
    /// Maps the request to a new tierlist row of <paramref name="userId"/>.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user creating the tierlist.</param>
    /// <returns>The row to insert, with the name trimmed and a blank description stored as null.</returns>
    public Tierlist ToTierlist(string userId) => new()
    {
        UserId = userId,
        Emoji = Emoji,
        Name = Name.Trim(),
        Description = string.IsNullOrWhiteSpace(Description) ? null : Description.Trim(),
        Pinned = Pinned
    };
}
