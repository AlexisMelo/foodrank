using System.ComponentModel.DataAnnotations;

namespace api.Models;

/// <summary>
/// Body of POST /api/restaurants/{id}/ratings. Out of range values are rejected with a 400, and so are decimals, which
/// cannot be read as whole numbers.
/// </summary>
/// <param name="Food">Food rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Service">Service rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Setting">Setting (decor) rating, whole number from <see cref="Rating.MinScore"/> to
/// <see cref="Rating.MaxScore"/>.</param>
/// <param name="Bonus">True when the user gives the "instant crush" favorite bonus.</param>
public record RateRestaurantRequest(
    [Range(Rating.MinScore, Rating.MaxScore)] int Food,
    [Range(Rating.MinScore, Rating.MaxScore)] int Service,
    [Range(Rating.MinScore, Rating.MaxScore)] int Setting,
    bool Bonus);
