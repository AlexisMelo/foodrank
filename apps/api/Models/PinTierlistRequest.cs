using System.ComponentModel.DataAnnotations;

namespace api.Models;

/// <summary>
/// Body of PUT /api/tierlists/{id}/pinned. A missing flag is rejected with a 400.
/// </summary>
/// <param name="Pinned">True to pin the tierlist to its owner's profile, false to unpin it.</param>
public record PinTierlistRequest([Required] bool? Pinned);
