using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for the tierlists users create to group restaurants. All of them require a logged-in user.
/// The tierlists of a user are served by <see cref="UsersController"/>.
/// </summary>
/// <param name="tierlistService">Saves and reads the tierlists.</param>
[ApiController]
[Route("api/tierlists")]
public class TierlistsController(ITierlistService tierlistService) : ControllerBase
{
    /// <summary>
    /// Saves and reads the tierlists.
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

    /// <summary>
    /// Returns a tierlist, of any user, with its restaurants.
    /// </summary>
    /// <param name="id">Database id of the tierlist.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the tierlist, 401 when not logged in, 404 when it does not exist (or the id is not a number).</returns>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken cancellationToken)
        => (await _tierlistService.GetByIdAsync(id, cancellationToken)).ToActionResult();
}
