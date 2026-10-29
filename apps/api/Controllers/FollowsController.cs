using api.Common;
using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

/// <summary>
/// Endpoints for users following each other: the followers of a user, the users it follows, its friends (both follow
/// each other), and following or unfollowing it as the logged-in user. All of them require a logged-in user, and take the user's real id ("me" is not
/// accepted: it is not a user id).
/// </summary>
/// <param name="followService">Saves and reads the follows.</param>
[ApiController]
[Route("api/users/{userId}")]
public class FollowsController(IFollowService followService) : ControllerBase
{
    /// <summary>
    /// Saves and reads the follows.
    /// </summary>
    private readonly IFollowService _followService = followService ?? throw new ArgumentNullException(nameof(followService));

    /// <summary>
    /// Returns the users following a user, the most recent follow first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the users (id, name, avatar), 401 when not logged in, 404 when the id is not a user id.</returns>
    [HttpGet("followers")]
    public async Task<IActionResult> GetFollowers(string userId, CancellationToken cancellationToken)
        => (await _followService.GetFollowersAsync(userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the users a user follows, the most recent follow first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the users (id, name, avatar), 401 when not logged in, 404 when the id is not a user id.</returns>
    [HttpGet("following")]
    public async Task<IActionResult> GetFollowing(string userId, CancellationToken cancellationToken)
        => (await _followService.GetFollowingAsync(userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Returns the friends of a user: the users it follows who follow it back, the most recent follow of the user first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the users (id, name, avatar), 401 when not logged in, 404 when the id is not a user id.</returns>
    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends(string userId, CancellationToken cancellationToken)
        => (await _followService.GetFriendsAsync(userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Makes the logged-in user follow a user; following a user already followed changes nothing.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user to follow.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the followers of the user, the logged-in user among them; 400 for the logged-in user's own
    /// id, 401 when not logged in, 404 when the id is not a user id or no user has it.</returns>
    [HttpPut("follow")]
    public async Task<IActionResult> Follow(string userId, CancellationToken cancellationToken)
        => (await _followService.FollowAsync(User.GetUserId(), userId, cancellationToken)).ToActionResult();

    /// <summary>
    /// Makes the logged-in user stop following a user; unfollowing a user not followed changes nothing.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user to unfollow.</param>
    /// <param name="cancellationToken">Cancels the request when the client disconnects.</param>
    /// <returns>200 with the followers of the user, without the logged-in user; 401 when not logged in, 404 when the id
    /// is not a user id.</returns>
    [HttpDelete("follow")]
    public async Task<IActionResult> Unfollow(string userId, CancellationToken cancellationToken)
        => (await _followService.UnfollowAsync(User.GetUserId(), userId, cancellationToken)).ToActionResult();
}
