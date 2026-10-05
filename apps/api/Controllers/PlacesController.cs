using api.Common;
using api.Services;
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
    /// Returns a few restaurant suggestions for a partial input, favoring those near the given position.
    /// </summary>
    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete([FromQuery] string input, [FromQuery] double? lat, [FromQuery] double? lon, CancellationToken cancellationToken)
        => (await placeSearchService.AutocompleteAsync(input, lat, lon, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns a longer list of restaurants for the search results page.
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query, [FromQuery] double? lat, [FromQuery] double? lon, CancellationToken cancellationToken)
        => (await placeSearchService.SearchAsync(query, lat, lon, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the city searches are centered on (the user's, or the default one when no position is given).
    /// </summary>
    [HttpGet("area")]
    public async Task<IActionResult> Area([FromQuery] double? lat, [FromQuery] double? lon, CancellationToken cancellationToken)
        => (await placeSearchService.GetSearchAreaAsync(lat, lon, cancellationToken)).ToActionResult();
}
