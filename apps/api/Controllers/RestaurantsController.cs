using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
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
    public async Task<ActionResult<IReadOnlyList<Restaurant>>> GetAll(CancellationToken cancellationToken)
        => Ok(await restaurantService.GetAllAsync(cancellationToken));

    /// <summary>
    /// Returns the restaurants the logged-in user has not rated yet, nearest first, with their distance, their global
    /// score and the users the logged-in user follows who rated them. Without a valid position, they are sorted from the
    /// default city and returned without distance.
    /// </summary>
    /// <param name="lat">Latitude of the user in degrees; omitted when unknown.</param>
    /// <param name="lon">Longitude of the user in degrees; omitted when unknown.</param>
    /// <param name="limit">Maximum number of suggestions, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the suggestions, 400 when the limit is outside 1-50, 401 when not logged in.</returns>
    [HttpGet("suggestions")]
    public async Task<ActionResult<IReadOnlyList<RestaurantSuggestionResponse>>> GetSuggestions([FromQuery] double? lat, [FromQuery] double? lon, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => Ok(await restaurantService.GetSuggestionsAsync(User.GetUserId(), lat, lon, limit, cancellationToken));

    /// <summary>
    /// Returns the restaurants the users the logged-in user follows recommend (an active rating of at least 5 on average
    /// by one of them), which the logged-in user never rated, at most 10 km away, nearest first, with their distance,
    /// their global score and the users followed who rated them. Without a valid position, the 10 km are measured from
    /// the default city and no distance is returned.
    /// </summary>
    /// <param name="lat">Latitude of the user in degrees; omitted when unknown.</param>
    /// <param name="lon">Longitude of the user in degrees; omitted when unknown.</param>
    /// <param name="limit">Maximum number of recommendations, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the recommendations (empty when the user follows nobody or nothing matches), 400 when the limit
    /// is outside 1-50, 401 when not logged in.</returns>
    [HttpGet("recommendations")]
    public async Task<ActionResult<IReadOnlyList<RestaurantSuggestionResponse>>> GetRecommendations([FromQuery] double? lat, [FromQuery] double? lon, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => Ok(await restaurantService.GetRecommendationsAsync(User.GetUserId(), lat, lon, limit, cancellationToken));

    /// <summary>
    /// Returns a single restaurant from its database identifier (404 when it does not exist).
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<Restaurant>> GetById(string id, CancellationToken cancellationToken)
        => (await restaurantService.GetByIdAsync(id, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the restaurant matching a place selected in the search, creating it on first selection, and whether this
    /// request created it.
    /// </summary>
    [HttpPost("from-place")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Places)]
    public async Task<ActionResult<RestaurantFromPlaceResponse>> FromPlace([FromBody] CreateRestaurantFromPlaceRequest request, CancellationToken cancellationToken)
        => (await restaurantService.GetOrCreateFromPlaceAsync(request.PlaceId, cancellationToken)).ToActionResult();
}
