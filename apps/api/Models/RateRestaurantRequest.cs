using System.ComponentModel.DataAnnotations;

namespace api.Models;

/// <summary>
/// Body of POST /api/restaurants/{id}/ratings. Out of range values are rejected with a 400.
/// </summary>
/// <param name="Food">Food rating, from 0 to 100.</param>
/// <param name="Service">Service rating, from 0 to 100.</param>
/// <param name="Setting">Setting (decor) rating, from 0 to 100.</param>
/// <param name="Bonus">True when the user gives the "instant crush" favorite bonus.</param>
public record RateRestaurantRequest(
    [Range(0, 100)] float Food,
    [Range(0, 100)] float Service,
    [Range(0, 100)] float Setting,
    bool Bonus);
