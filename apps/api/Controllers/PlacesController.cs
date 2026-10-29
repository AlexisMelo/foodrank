using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Models;
using api.Services;
using api.Services.Places;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace api.Controllers;

/// <summary>
/// Search endpoints for real-world restaurants (external place provider).
/// </summary>
[ApiController]
[Route("api/places")]
[EnableRateLimiting(RateLimitPolicies.Places)]
[AllowAnonymous]
public class PlacesController(IPlaceSearchService placeSearchService) : ControllerBase
{
    /// <summary>
    /// Returns the first restaurants matching a query, favoring those near the given position. The search results
    /// page asks for 5, then for 10 more on each "Show more": the first results stay the same.
    /// </summary>
    /// <param name="query">Text typed by the user; shorter than 3 characters once trimmed, it returns no result.</param>
    /// <param name="lat">Latitude of the user in degrees; omitted when unknown.</param>
    /// <param name="lon">Longitude of the user in degrees; omitted when unknown.</param>
    /// <param name="limit">Maximum number of results, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the results and whether there are more, 400 when the limit is outside 1-50, 503 when the
    /// place provider is unavailable.</returns>
    [HttpGet("search")]
    public async Task<ActionResult<SearchPage<PlaceSuggestion>>> Search([FromQuery] string query, [FromQuery] double? lat, [FromQuery] double? lon, [FromQuery, Range(1, PlaceSearchService.MaxResults)] int limit = 5, CancellationToken cancellationToken = default)
        => (await placeSearchService.SearchAsync(query, limit, lat, lon, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the city searches are centered on (the user's, or the default one when no position is given).
    /// </summary>
    [HttpGet("area")]
    public async Task<ActionResult<SearchArea>> Area([FromQuery] double? lat, [FromQuery] double? lon, CancellationToken cancellationToken)
        => (await placeSearchService.GetSearchAreaAsync(lat, lon, cancellationToken)).ToActionResult();
}
