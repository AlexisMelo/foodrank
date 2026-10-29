using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for users' public information (search, profile, ratings, tierlists) and the recent ratings of the users
/// the logged-in user follows. All of them require a logged-in user; "me" stands for the logged-in user.
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
    /// Tells whether the logged-in user can rate a restaurant now: a user rates at most one restaurant per day (UTC).
    /// </summary>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with whether the user can rate and, when they cannot, when they can rate again; 401 when not logged in.</returns>
    [HttpGet("me/rating-allowance")]
    public async Task<IActionResult> GetMyRatingAllowance(CancellationToken cancellationToken)
        => (await _ratingService.GetAllowanceAsync(User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every tierlist of the logged-in user, with its restaurants, most recently created first.
    /// </summary>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the tierlists, 401 when not logged in.</returns>
    [HttpGet("me/tierlists")]
    public async Task<IActionResult> GetMyTierlists(CancellationToken cancellationToken)
        => (await _tierlistService.GetByUserAsync(User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the most recent ratings given by the users the logged-in user follows, with their restaurant and their
    /// author, most recent first.
    /// </summary>
    /// <param name="limit">Maximum number of ratings returned, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 400 when the limit is outside 1-50, 401 when not logged in.</returns>
    [HttpGet("me/following/ratings")]
    public async Task<IActionResult> GetFollowedRatings([FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => Ok(await _ratingService.GetFromFollowedUsersAsync(User.GetUserId(), limit, cancellationToken));

    /// <summary>
    /// Finds the first users whose pseudonym contains a query, ignoring case, best matches first (see
    /// <see cref="UserRanking.Rank"/>). The logged-in user is not listed.
    /// </summary>
    /// <param name="query">Text typed by the user; shorter than 3 characters once trimmed, it returns no user.</param>
    /// <param name="limit">Maximum number of users, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the users (id, name, avatar) and whether there are more, 400 when the limit is outside 1-50,
    /// 401 when not logged in.</returns>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query, [FromQuery, Range(1, UserRanking.MaxResults)] int limit = 5, CancellationToken cancellationToken = default)
        => Ok(await _userService.SearchAsync(query, limit, User.GetUserId(), cancellationToken));

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
