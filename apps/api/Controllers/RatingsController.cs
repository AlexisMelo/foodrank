using System.ComponentModel.DataAnnotations;
using api.Common;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for the ratings users give to restaurants. The ratings of a user are served by <see cref="UsersController"/>.
/// </summary>
/// <param name="ratingService">Saves and reads the ratings.</param>
[ApiController]
[Route("api/restaurants/{restaurantId}/ratings")]
public class RatingsController(IRatingService ratingService) : ControllerBase
{
    /// <summary>
    /// Saves and reads the ratings.
    /// </summary>
    private readonly IRatingService _ratingService = ratingService ?? throw new ArgumentNullException(nameof(ratingService));

    /// <summary>
    /// Saves the logged-in user's rating of a restaurant for today.
    /// </summary>
    /// <param name="restaurantId">Database id of the rated restaurant.</param>
    /// <param name="request">Food, service and setting ratings, and the favorite bonus.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the saved rating, 401 when not logged in, 404 for an unknown restaurant, 409 when the user
    /// already rated a restaurant today.</returns>
    [HttpPost]
    public async Task<ActionResult<Rating>> Create(string restaurantId, [FromBody] RateRestaurantRequest request, CancellationToken cancellationToken)
        => (await _ratingService.CreateAsync(restaurantId, User.GetUserId(), request, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the most recent active ratings of a restaurant (each user's latest), most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="limit">Maximum number of ratings returned, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 400 when the limit is outside 1-50, 404 for an unknown restaurant.</returns>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<RatingResponse>>> GetRecent(string restaurantId, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => (await _ratingService.GetRecentAsync(restaurantId, limit, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the most recent active ratings of a restaurant (each user's latest) given by the users the logged-in user
    /// follows, most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="limit">Maximum number of ratings returned, from 1 to 50 (5 by default).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings (empty when the user follows nobody who rated the restaurant), 400 when the limit is
    /// outside 1-50, 401 when not logged in, 404 for an unknown restaurant.</returns>
    [HttpGet("followed")]
    public async Task<ActionResult<IReadOnlyList<RatingResponse>>> GetFollowed(string restaurantId, [FromQuery, Range(1, 50)] int limit = 5, CancellationToken cancellationToken = default)
        => (await _ratingService.GetRecentFromFollowedUsersAsync(restaurantId, User.GetUserId(), limit, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the averages of a restaurant's active ratings (each user's latest), per criterion and globally.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the averages (null when the restaurant has no rating), 404 for an unknown restaurant.</returns>
    [HttpGet("summary")]
    [AllowAnonymous]
    public async Task<ActionResult<RatingSummaryResponse>> GetSummary(string restaurantId, CancellationToken cancellationToken)
        => (await _ratingService.GetSummaryAsync(restaurantId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns every rating the logged-in user gave to a restaurant, most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings, 401 when not logged in, 404 for an unknown restaurant.</returns>
    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<RatingResponse>>> GetMine(string restaurantId, CancellationToken cancellationToken)
        => (await _ratingService.GetByRestaurantAndUserAsync(restaurantId, User.GetUserId(), cancellationToken)).ToActionResult();

    /// <summary>
    /// Deletes one rating the logged-in user gave to a restaurant. When it was their active rating, their previous one
    /// becomes active again; when it was their only one, the restaurant leaves their tierlists.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="date">Moment of the rating, as returned by the API (ISO 8601, URL-encoded).</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings the user has left for the restaurant, most recent first; 400 when the date is not a
    /// date, 401 when not logged in, 404 for an unknown restaurant or when the user gave no rating at this moment.</returns>
    [HttpDelete("mine/{date}")]
    public async Task<ActionResult<IReadOnlyList<RatingResponse>>> DeleteMine(string restaurantId, DateTimeOffset date, CancellationToken cancellationToken)
        => (await _ratingService.DeleteAsync(restaurantId, User.GetUserId(), date, cancellationToken)).ToActionResult();

    /// <summary>
    /// Deletes every rating the logged-in user gave to a restaurant, and removes the restaurant from their tierlists.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the ratings the user has left for the restaurant (none), 401 when not logged in, 404 for an
    /// unknown restaurant.</returns>
    [HttpDelete("mine")]
    public async Task<ActionResult<IReadOnlyList<RatingResponse>>> DeleteAllMine(string restaurantId, CancellationToken cancellationToken)
        => (await _ratingService.DeleteAllAsync(restaurantId, User.GetUserId(), cancellationToken)).ToActionResult();
}
