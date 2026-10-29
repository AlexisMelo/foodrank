using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IFollowService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as the
/// real service (checked with <see cref="FollowService.CheckFollow"/>, the most recent follow first, following twice or
/// unfollowing a user not followed changes nothing) and lists the profiles of <see cref="FakeUserService"/>.
/// </summary>
/// <param name="users">Reads the profiles listed.</param>
/// <param name="ratings">Profiles "stored in the database": a user can be followed when it has one, standing for the
/// foreign keys of the "follow" table to "profiles".</param>
public class FakeFollowService(FakeUserService users, FakeRatingService ratings) : IFollowService
{
    /// <summary>
    /// Follows "stored in the database", in insertion order; their <see cref="Follow.CreatedAt"/> orders the lists.
    /// </summary>
    public List<Follow> Follows { get; } = [];

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowersAsync(string userId, CancellationToken cancellationToken)
        => ProfilesAsync(userId, Follows.Where(f => f.FollowedId == userId), f => f.FollowerId, cancellationToken);

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFollowingAsync(string userId, CancellationToken cancellationToken)
        => ProfilesAsync(userId, Follows.Where(f => f.FollowerId == userId), f => f.FollowedId, cancellationToken);

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<UserSummaryResponse>>> GetFriendsAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);

        // Like the real service: the follows of the user, the most recent first, kept when followed back
        List<string> friendIds = FollowService.FriendIds(
            MostRecentFirst(Follows.Where(f => f.FollowerId == userId)),
            Follows.Where(f => f.FollowedId == userId));
        return Result<IReadOnlyList<UserSummaryResponse>>.Success(await users.GetProfilesAsync(friendIds, cancellationToken));
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> FollowAsync(string followerId, string userId, CancellationToken cancellationToken)
    {
        Error? error = FollowService.CheckFollow(followerId, userId);
        if (error is not null)
            return Task.FromResult(Result<IReadOnlyList<UserSummaryResponse>>.Failure(error));
        if (!ratings.Profiles.ContainsKey(userId))
            return Task.FromResult(Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound));

        // Like the primary key (follower, followed)
        if (!Follows.Any(f => f.FollowerId == followerId && f.FollowedId == userId))
            Follows.Add(new Follow { FollowerId = followerId, FollowedId = userId, CreatedAt = DateTime.UtcNow });
        return GetFollowersAsync(userId, cancellationToken);
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<UserSummaryResponse>>> UnfollowAsync(string followerId, string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Task.FromResult(Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound));

        Follows.RemoveAll(f => f.FollowerId == followerId && f.FollowedId == userId);
        return GetFollowersAsync(userId, cancellationToken);
    }

    /// <summary>
    /// Profiles of the users at the other end (<paramref name="otherUserId"/>) of <paramref name="follows"/>, the most
    /// recent follow first; a NotFound failure when <paramref name="userId"/> is not a uuid.
    /// </summary>
    private async Task<Result<IReadOnlyList<UserSummaryResponse>>> ProfilesAsync(string userId, IEnumerable<Follow> follows, Func<Follow, string> otherUserId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<IReadOnlyList<UserSummaryResponse>>.Failure(UserIds.NotFound);

        List<string> userIds = MostRecentFirst(follows).Select(otherUserId).ToList();
        return Result<IReadOnlyList<UserSummaryResponse>>.Success(await users.GetProfilesAsync(userIds, cancellationToken));
    }

    /// <summary>
    /// Orders <paramref name="follows"/> like the real query, the most recent first. Two follows saved in the same tick:
    /// the one inserted last is the most recent.
    /// </summary>
    private static IEnumerable<Follow> MostRecentFirst(IEnumerable<Follow> follows)
        => follows
            .Select((follow, index) => (follow, index))
            .OrderByDescending(f => f.follow.CreatedAt)
            .ThenByDescending(f => f.index)
            .Select(f => f.follow);
}
