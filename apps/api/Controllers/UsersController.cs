using api.Common;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for users' public information (profile, ratings, tierlists). All of them require a logged-in user;
/// "me" stands for the logged-in user.
/// </summary>
/// <param name="userService">Reads the users' profiles.</param>
/// <param name="ratingService">Reads the users' ratings.</param>
/// <param name="tierlistService">Reads the users' tierlists.</param>
[ApiController]
[Route("api/users")]
public class UsersController(IUserService userService, IRatingService ratingService, ITierlistService tierlistService) : ControllerBase
{
    /// <summary>
    /// Reads the users' profiles.
    /// </summary>
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));

    /// <summary>
    /// Reads the users' ratings.
    /// </summary>
    private readonly IRatingService _ratingService = ratingService ?? throw new ArgumentNullException(nameof(ratingService));

    /// <summary>
    /// Reads the users' tierlists.
    /// </summary>
    private readonly ITierlistService _tierlistService = tierlistService ?? throw new ArgumentNullException(nameof(tierlistService));

    /// <summary>
    /// Returns the logged-in user's profile.
    /// </summary>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the profile, 401 when not logged in.</returns>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
        => (await _userService.GetProfileAsync(User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every rating of the logged-in user, with its restaurant, most recent first.
    /// </summary>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 401 when not logged in.</returns>
    [HttpGet("me/ratings")]
    public async Task<IActionResult> GetMyRatings(CancellationToken cancellationToken)
        => (await _ratingService.GetByUserAsync(User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every tierlist of the logged-in user, with its restaurants, most recently created first.
    /// </summary>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the tierlists, 401 when not logged in.</returns>
    [HttpGet("me/tierlists")]
    public async Task<IActionResult> GetMyTierlists(CancellationToken cancellationToken)
        => (await _tierlistService.GetByUserAsync(User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the profile of a user.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the profile, 404 when the id is not a user id.</returns>
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetById(string userId, CancellationToken cancellationToken)
        => (await _userService.GetProfileAsync(userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every rating of a user, with its restaurant, most recent first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 404 when the id is not a user id.</returns>
    [HttpGet("{userId}/ratings")]
    public async Task<IActionResult> GetRatings(string userId, CancellationToken cancellationToken)
        => (await _ratingService.GetByUserAsync(userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every tierlist of a user, with its restaurants, most recently created first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the tierlists, 404 when the id is not a user id.</returns>
    [HttpGet("{userId}/tierlists")]
    public async Task<IActionResult> GetTierlists(string userId, CancellationToken cancellationToken)
        => (await _tierlistService.GetByUserAsync(userId, cancellationToken)).ToActionResult();
}
