using System.ComponentModel.DataAnnotations;

namespace api.Models;

/// <summary>
/// Body of POST /api/tierlists/{id}/restaurants. A missing or blank restaurant id is rejected with a 400.
/// </summary>
/// <param name="RestaurantId">Database id of the restaurant to add to the tierlist.</param>
public record AddTierlistRestaurantRequest([Required] string RestaurantId);
