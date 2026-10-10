using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for the tierlists users create to group restaurants. All of them require a logged-in user.
/// </summary>
/// <param name="tierlistService">Saves the tierlists.</param>
[ApiController]
[Route("api/tierlists")]
public class TierlistsController(ITierlistService tierlistService) : ControllerBase
{
    /// <summary>
    /// Saves the tierlists.
    /// </summary>
    private readonly ITierlistService _tierlistService = tierlistService ?? throw new ArgumentNullException(nameof(tierlistService));

    /// <summary>
    /// Creates a tierlist, without restaurants, for the logged-in user.
    /// </summary>
    /// <param name="request">Emoji, name, optional description and pinned flag.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the created tierlist, 400 for invalid values, 401 when not logged in.</returns>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTierlistRequest request, CancellationToken cancellationToken)
        => (await _tierlistService.CreateAsync(User.GetUserId(), request, cancellationToken)).ToActionResult();
}
