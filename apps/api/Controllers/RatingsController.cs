using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for the ratings users give to restaurants.
/// </summary>
[ApiController]
[Route("api/restaurants/{restaurantId}/ratings")]
public class RatingsController(IRatingService ratingService) : ControllerBase
{
    /// <summary>
    /// Saves the logged-in user's rating of a restaurant for today
    /// (401 when not logged in, 404 for an unknown restaurant, 409 when already rated today).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(string restaurantId, [FromBody] RateRestaurantRequest request, CancellationToken cancellationToken)
        => (await ratingService.CreateAsync(restaurantId, User.GetUserId(), request, cancellationToken)).ToActionResult();
}
