using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Saves and reads who follows whom. Following is one-way, without request to accept; the users listed (id, name and
/// avatar, no number of restaurants rated) are read by <see cref="IUserService"/>.
/// </summary>
public interface IFollowService
{
    /// <summary>
    /// Returns the profiles of the users following <paramref name="userId"/>, the most recent follow first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user followed.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The profiles (empty when nobody follows the user), or a NotFound failure when <paramref name="userId"/>
    /// is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowersAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the profiles of the users <paramref name="userId"/> follows, the most recent follow first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user following.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The profiles (empty when the user follows nobody), or a NotFound failure when <paramref name="userId"/>
    /// is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowingAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the profiles of the friends of <paramref name="userId"/>: the users it follows who follow it back, the
    /// most recent follow of <paramref name="userId"/> first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The profiles (empty when the user has no friend), or a NotFound failure when <paramref name="userId"/>
    /// is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFriendsAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Makes <paramref name="followerId"/> follow <paramref name="userId"/>. Following a user already followed changes
    /// nothing and succeeds.
    /// </summary>
    /// <param name="followerId">Supabase Auth id of the logged-in user, who follows.</param>
    /// <param name="userId">Supabase Auth id of the user to follow.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The followers of <paramref name="userId"/> once followed (see <see cref="GetFollowersAsync"/>), a
    /// NotFound failure when <paramref name="userId"/> is not a user id or no user has it, or a Validation failure when
    /// it is <paramref name="followerId"/>.</returns>
    Task<Result<IReadOnlyList<UserSummaryResponse>>> FollowAsync(string followerId, string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Makes <paramref name="followerId"/> stop following <paramref name="userId"/>. Unfollowing a user not followed
    /// changes nothing and succeeds.
    /// </summary>
    /// <param name="followerId">Supabase Auth id of the logged-in user, who stops following.</param>
    /// <param name="userId">Supabase Auth id of the user to unfollow.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The followers of <paramref name="userId"/> once unfollowed (see <see cref="GetFollowersAsync"/>), or a
    /// NotFound failure when <paramref name="userId"/> is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserSummaryResponse>>> UnfollowAsync(string followerId, string userId, CancellationToken cancellationToken);
}
