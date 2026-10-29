using api.Common;
using api.Models;
using api.Services;
using Api.Tests.Fakes;
using Supabase.Postgrest.Interfaces;

namespace Api.Tests.Services;

/// <summary>
/// Tests the Supabase-backed <see cref="FollowService"/> rules that need no database, and the queries it sends, by
/// generating their URL without sending them.
/// </summary>
public class FollowServiceTests
{
    /// <summary>
    /// Id of the user following.
    /// </summary>
    private const string FollowerId = "aaaaaaaa-1111-1111-1111-111111111111";

    /// <summary>
    /// Id of the user followed.
    /// </summary>
    private const string FollowedId = "bbbbbbbb-2222-2222-2222-222222222222";

    /// <summary>
    /// The service refuses a missing dependency instead of failing on the first query.
    /// </summary>
    [Fact]
    public void Constructor_NullDependency_Throws()
    {
        Supabase.Client supabase = new("http://localhost", "test-key", new Supabase.SupabaseOptions { AutoConnectRealtime = false });

        Assert.Equal("supabase", Assert.Throws<ArgumentNullException>(
            () => new FollowService(null!, new FakeUserService(new FakeRatingService(new FakeRestaurantService())))).ParamName);
        Assert.Equal("userService", Assert.Throws<ArgumentNullException>(
            () => new FollowService(supabase, null!)).ParamName);
    }

    /// <summary>
    /// The query of a follow (sent to unfollow) filters on both the follower and the user followed, so the delete never
    /// removes the follower's other follows, nor the other followers of the user.
    /// </summary>
    [Fact]
    public void FollowQuery_FiltersOnFollowerAndFollowed()
    {
        IPostgrestTable<Follow> table = new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<Follow>();

        string url = Uri.UnescapeDataString(FollowService.FollowQuery(table, FollowerId, FollowedId).GenerateUrl());

        Assert.Contains($"id_follower=eq.{FollowerId}", url);
        Assert.Contains($"id_followed=eq.{FollowedId}", url);
    }

    /// <summary>
    /// Another user can be followed.
    /// </summary>
    [Fact]
    public void CheckFollow_OtherUser_ReturnsNull()
    {
        Assert.Null(FollowService.CheckFollow(FollowerId, FollowedId));
    }

    /// <summary>
    /// An id that is not a uuid is not a user, checked before any query (PostgreSQL would fail on it).
    /// </summary>
    [Theory]
    [InlineData("alex")]
    [InlineData("me")]
    [InlineData("")]
    public void CheckFollow_NotAUserId_ReturnsNotFound(string userId)
    {
        Assert.Equal(UserIds.NotFound, FollowService.CheckFollow(FollowerId, userId));
    }

    /// <summary>
    /// A user cannot follow themselves, whatever the case of the id: uuids are compared, not strings.
    /// </summary>
    [Theory]
    [InlineData(FollowerId)]
    [InlineData("AAAAAAAA-1111-1111-1111-111111111111")]
    public void CheckFollow_OwnId_ReturnsCannotFollowYourself(string userId)
    {
        Assert.Equal(FollowService.CannotFollowYourself, FollowService.CheckFollow(FollowerId, userId));
    }
}
