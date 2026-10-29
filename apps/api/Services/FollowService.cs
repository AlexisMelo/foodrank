using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Interfaces;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Saves and reads who follows whom in the "follow" table, with the profiles of the users listed from
/// <see cref="IUserService"/>.
/// </summary>
/// <param name="supabase">Client of the Supabase database.</param>
/// <param name="userService">Reads the profiles of the followers and of the users followed.</param>
public class FollowService(Supabase.Client supabase, IUserService userService) : IFollowService
{
    /// <summary>
    /// Error returned when a user tries to follow themselves.
    /// </summary>
    public static Error CannotFollowYourself { get; } = new(ErrorType.Validation, "You can't follow yourself.");

    /// <summary>
    /// Client of the Supabase database.
    /// </summary>
    private readonly Supabase.Client _supabase = supabase ?? throw new ArgumentNullException(nameof(supabase));

    /// <summary>
    /// Reads the profiles of the followers and of the users followed.
    /// </summary>
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowersAsync(string userId, CancellationToken cancellationToken)
        => GetProfilesAsync("id_followed", userId, f => f.FollowerId, cancellationToken);

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowingAsync(string userId, CancellationToken cancellationToken)
        => GetProfilesAsync("id_follower", userId, f => f.FollowedId, cancellationToken);

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFriendsAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);

        ModeledResponse<Follow> following = await UserFollowsQuery(_supabase.From<Follow>(), "id_follower", userId).Get(cancellationToken);
        ModeledResponse<Follow> followers = await UserFollowsQuery(_supabase.From<Follow>(), "id_followed", userId).Get(cancellationToken);

        return Result<IReadOnlyList<UserSummaryResponse>>.Success(
            await _userService.GetProfilesAsync(FriendIds(following.Models, followers.Models), cancellationToken));
    }

    /// <summary>
    /// Keeps the users followed who follow back: the friends of a user, in the order of <paramref name="following"/>.
    /// </summary>
    /// <param name="following">Follows of the user (the user is the follower), the most recent first.</param>
    /// <param name="followers">Follows of the user by others (the user is followed).</param>
    /// <returns>The ids of the users the user follows who also follow it; empty when there is none.</returns>
    public static List<string> FriendIds(IEnumerable<Follow> following, IEnumerable<Follow> followers)
    {
        HashSet<string> followerIds = followers.Select(f => f.FollowerId).ToHashSet();
        return following.Select(f => f.FollowedId).Where(followerIds.Contains).ToList();
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<UserSummaryResponse>>> FollowAsync(string followerId, string userId, CancellationToken cancellationToken)
    {
        Error? error = CheckFollow(followerId, userId);
        if (error is not null)
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(error);

        try
        {
            await _supabase.From<Follow>().Insert(new Follow { FollowerId = followerId, FollowedId = userId }, cancellationToken: cancellationToken);
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsUniqueViolation(ex))
        {
            // Already followed: nothing to change
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsForeignKeyViolation(ex))
        {
            // A uuid that is no user id
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);
        }

        return await GetFollowersAsync(userId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<UserSummaryResponse>>> UnfollowAsync(string followerId, string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);

        // Deletes no row when the user was not followed
        await FollowQuery(_supabase.From<Follow>(), followerId, userId).Delete(cancellationToken: cancellationToken);

        return await GetFollowersAsync(userId, cancellationToken);
    }

    /// <summary>
    /// Checks that <paramref name="followerId"/> can follow <paramref name="userId"/>, before any query: the id must be
    /// a user id (PostgreSQL fails on another format), and not the follower's own id, whatever its case.
    /// </summary>
    /// <param name="followerId">Supabase Auth id of the logged-in user, who follows.</param>
    /// <param name="userId">Id of the user to follow, read from the url.</param>
    /// <returns>Null when the follow can be saved, else <see cref="UserIds.NotFound"/> or
    /// <see cref="CannotFollowYourself"/>.</returns>
    public static Error? CheckFollow(string followerId, string userId)
    {
        if (!Guid.TryParse(userId, out Guid followed))
            return UserIds.NotFound;
        return Guid.TryParse(followerId, out Guid follower) && follower == followed ? CannotFollowYourself : null;
    }

    /// <summary>
    /// Query of the row of <paramref name="followerId"/> following <paramref name="followedId"/>. Both keys are
    /// filtered, each in its own Where, so a delete sent with it never removes other rows.
    /// </summary>
    /// <param name="follows">Query on the "follow" table to filter.</param>
    /// <param name="followerId">Supabase Auth id of the user who follows.</param>
    /// <param name="followedId">Supabase Auth id of the user followed.</param>
    /// <returns>The filtered query, ready to send.</returns>
    public static IPostgrestTable<Follow> FollowQuery(IPostgrestTable<Follow> follows, string followerId, string followedId)
        => follows
            .Where(f => f.FollowerId == followerId)
            .Where(f => f.FollowedId == followedId);

    /// <summary>
    /// Query of the follows whose <paramref name="userColumn"/> is <paramref name="userId"/>, the most recent first.
    /// </summary>
    /// <param name="follows">Query on the "follow" table to filter.</param>
    /// <param name="userColumn">"id_followed" for the follows of the user by others, "id_follower" for the follows of
    /// the user.</param>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <returns>The filtered and ordered query, ready to send.</returns>
    public static IPostgrestTable<Follow> UserFollowsQuery(IPostgrestTable<Follow> follows, string userColumn, string userId)
        => follows
            .Filter(userColumn, Constants.Operator.Equals, userId)
            .Order("created_at", Constants.Ordering.Descending);

    /// <summary>
    /// Reads the follows whose <paramref name="userColumn"/> is <paramref name="userId"/>, the most recent first, and
    /// returns the profiles of the users at their other end (<paramref name="otherUserId"/>).
    /// </summary>
    /// <param name="userColumn">"id_followed" to list the followers of the user, "id_follower" to list the users it
    /// follows.</param>
    /// <param name="userId">Supabase Auth id of the user, read from the url.</param>
    /// <param name="otherUserId">Reads the id of the user listed from a follow.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    private async Task<Result<IReadOnlyList<UserSummaryResponse>>> GetProfilesAsync(string userColumn, string userId, Func<Follow, string> otherUserId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);

        ModeledResponse<Follow> follows = await UserFollowsQuery(_supabase.From<Follow>(), userColumn, userId).Get(cancellationToken);
        List<string> userIds = follows.Models.Select(otherUserId).ToList();

        return Result<IReadOnlyList<UserSummaryResponse>>.Success(await _userService.GetProfilesAsync(userIds, cancellationToken));
    }
}
