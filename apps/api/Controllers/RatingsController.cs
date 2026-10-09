using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for the ratings users give to restaurants. The ratings of a user are served by <see cref="UsersController"/>.
/// </summary>
/// <param name="ratingService">Saves and reads the ratings.</param>
[ApiController]
[Route("api/restaurants/{restaurantId}/ratings")]
public class RatingsController(IRatingService ratingService) : ControllerBase
{
    /// <summary>
    /// Saves and reads the ratings.
    /// </summary>
    private readonly IRatingService _ratingService = ratingService ?? throw new ArgumentNullException(nameof(ratingService));

    /// <summary>
    /// Saves the logged-in user's rating of a restaurant for today.
    /// </summary>
    /// <param name="restaurantId">Database id of the rated restaurant.</param>
    /// <param name="request">Food, service and setting ratings, and the favorite bonus.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the saved rating, 401 when not logged in, 404 for an unknown restaurant, 409 when already rated today.</returns>
    [HttpPost]
    public async Task<IActionResult> Create(string restaurantId, [FromBody] RateRestaurantRequest request, CancellationToken cancellationToken)
        => (await _ratingService.CreateAsync(restaurantId, User.GetUserId(), request, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the most recent ratings of a restaurant by every user, most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="limit">Maximum number of ratings returned, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 400 when the limit is outside 1-50, 404 for an unknown restaurant.</returns>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetRecent(string restaurantId, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => (await _ratingService.GetRecentAsync(restaurantId, limit, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every rating the logged-in user gave to a restaurant, most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 401 when not logged in, 404 for an unknown restaurant.</returns>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(string restaurantId, CancellationToken cancellationToken)
        => (await _ratingService.GetByRestaurantAndUserAsync(restaurantId, User.GetUserId(), cancellationToken)).ToActionResult();
}
