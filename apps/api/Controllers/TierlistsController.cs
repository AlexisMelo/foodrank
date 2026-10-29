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
    public async Task<ActionResult<TierlistResponse>> Create([FromBody] CreateTierlistRequest request, CancellationToken cancellationToken)
        => (await _tierlistService.CreateAsync(User.GetUserId(), request, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns a tierlist, of any user, with its restaurants.
    /// </summary>
    /// <param name="id">Database id of the tierlist.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the tierlist, 401 when not logged in, 404 when it does not exist (or the id is not a number).</returns>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<TierlistResponse>> GetById(long id, CancellationToken cancellationToken)
        => (await _tierlistService.GetByIdAsync(id, cancellationToken)).ToActionResult();

    /// <summary>
    /// Pins a tierlist of the logged-in user to their profile, or unpins it.
    /// </summary>
    /// <param name="id">Database id of the tierlist.</param>
    /// <param name="request">The pinned flag.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the updated tierlist, 400 without the flag, 401 when not logged in, 403 for a tierlist of
    /// another user, 404 when it does not exist.</returns>
    [HttpPut("{id:long}/pinned")]
    public async Task<ActionResult<TierlistResponse>> SetPinned(long id, [FromBody] PinTierlistRequest request, CancellationToken cancellationToken)
        => (await _tierlistService.SetPinnedAsync(id, User.GetUserId(), request.Pinned!.Value, cancellationToken)).ToActionResult();

    /// <summary>
    /// Adds a restaurant the logged-in user rated to one of their tierlists.
    /// </summary>
    /// <param name="id">Database id of the tierlist.</param>
    /// <param name="request">Id of the restaurant to add.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the updated tierlist, 400 without a restaurant id or for a restaurant the user has not rated,
    /// 401 when not logged in, 403 for a tierlist of another user, 404 when the tierlist or the restaurant does not exist,
    /// 409 when the restaurant is already in the tierlist.</returns>
    [HttpPost("{id:long}/restaurants")]
    public async Task<ActionResult<TierlistResponse>> AddRestaurant(long id, [FromBody] AddTierlistRestaurantRequest request, CancellationToken cancellationToken)
        => (await _tierlistService.AddRestaurantAsync(id, User.GetUserId(), request.RestaurantId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Removes a restaurant from a tierlist of the logged-in user.
    /// </summary>
    /// <param name="id">Database id of the tierlist.</param>
    /// <param name="restaurantId">Database id of the restaurant to remove.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the updated tierlist, 401 when not logged in, 403 for a tierlist of another user, 404 when the
    /// tierlist does not exist or the restaurant is not in it.</returns>
    [HttpDelete("{id:long}/restaurants/{restaurantId}")]
    public async Task<ActionResult<TierlistResponse>> RemoveRestaurant(long id, string restaurantId, CancellationToken cancellationToken)
        => (await _tierlistService.RemoveRestaurantAsync(id, User.GetUserId(), restaurantId, cancellationToken)).ToActionResult();
}
