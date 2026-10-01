using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace api.Controllers;

/// <summary>
/// Controller for handling restaurant-related API endpoints.
/// </summary>
/// <param name="restaurantService"></param>
[ApiController]
[Route("api/restaurants")]
public class RestaurantsController(IRestaurantService restaurantService) : ControllerBase
{
    /// <summary>
    /// Retrieves all restaurants from the database.
    /// </summary>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        => Ok(await restaurantService.GetAllAsync(cancellationToken));

    /// <summary>
    /// Returns a single restaurant from its database identifier (404 when it does not exist).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
        => (await restaurantService.GetByIdAsync(id, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the restaurant matching a place selected in the search, creating it on first selection.
    /// </summary>
    [HttpPost("from-place")]
    [EnableRateLimiting(RateLimitPolicies.Places)]
    public async Task<IActionResult> FromPlace([FromBody] CreateRestaurantFromPlaceRequest request, CancellationToken cancellationToken)
        => (await restaurantService.GetOrCreateFromPlaceAsync(request.PlaceId, cancellationToken)).ToActionResult();
}
