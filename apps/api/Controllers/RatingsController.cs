using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
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

    /// <summary>
    /// Returns the <paramref name="limit"/> (5 by default) most recent ratings of a restaurant by every user, most recent first
    /// (404 for an unknown restaurant, 400 when the limit is outside 1-50).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetRecent(string restaurantId, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => (await ratingService.GetRecentAsync(restaurantId, limit, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every rating the logged-in user gave to a restaurant, most recent first
    /// (401 when not logged in, 404 for an unknown restaurant).
    /// </summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(string restaurantId, CancellationToken cancellationToken)
        => (await ratingService.GetByUserAsync(restaurantId, User.GetUserId(), cancellationToken)).ToActionResult();
}
