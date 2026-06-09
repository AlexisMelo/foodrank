using api.Models;
using Microsoft.AspNetCore.Mvc;
using Supabase.Postgrest.Responses;

namespace api.Controllers;

/// <summary>
/// Controller for handling restaurant-related API endpoints.
/// </summary>
/// <param name="supabase"></param>
[ApiController]
[Route("api/restaurants")]
public class RestaurantsController(Supabase.Client supabase) : ControllerBase
{
    /// <summary>
    /// Retrieves all restaurants from the database.
    /// </summary>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        ModeledResponse<Restaurant> response = await supabase.From<Restaurant>().Get(cancellationToken);
        return Ok(response.Models);
    }
}
