using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Controllers;
using api.Models;
using api.Services;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the follow endpoints (/api/users/{id}/followers, /following and /follow) through HTTP, with in-memory auth,
/// user and follow services.
/// </summary>
public class FollowsControllerTests : IDisposable
{
    /// <summary>
    /// Valid access token of <see cref="MeId"/>.
    /// </summary>
    private const string Token = "valid-token";

    /// <summary>
    /// Id of the logged-in user.
    /// </summary>
    private const string MeId = "11111111-1111-1111-1111-111111111111";

    /// <summary>
    /// Id of another user, named "camille".
    /// </summary>
    private const string CamilleId = "22222222-2222-2222-2222-222222222222";

    /// <summary>
    /// Id of a third user, named "hugo".
    /// </summary>
    private const string HugoId = "33333333-3333-3333-3333-333333333333";

    /// <summary>
    /// A uuid no user has.
    /// </summary>
    private const string UnknownId = "99999999-9999-9999-9999-999999999999";

    /// <summary>
    /// In-memory API, recreated for each test so data does not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client, the profiles of three users and a valid token for the first one.
    /// </summary>
    public FollowsControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.RatingService.Profiles[MeId] = new Profile { Id = MeId, Username = "alexis" };
        _factory.RatingService.Profiles[CamilleId] = new Profile { Id = CamilleId, Username = "camille", AvatarUrl = "https://img.test/camille.png" };
        _factory.RatingService.Profiles[HugoId] = new Profile { Id = HugoId, Username = "hugo" };
        _factory.AuthService.UserIdsByToken[Token] = MeId;
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Sends a <paramref name="method"/> request to <paramref name="url"/>, with the auth cookie when
    /// <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? token = Token)
    {
        HttpRequestMessage request = new(method, url);
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// Sends <paramref name="method"/> to <paramref name="url"/> as the logged-in user, checks the 200 and reads the
    /// profiles answered.
    /// </summary>
    private async Task<List<UserSummaryResponse>> ProfilesAsync(HttpMethod method, string url)
    {
        HttpResponseMessage response = await SendAsync(method, url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<UserSummaryResponse>>())!;
    }

    /// <summary>
    /// Stores <paramref name="followerId"/> following <paramref name="followedId"/> since the day
    /// <paramref name="day"/> of March 2026.
    /// </summary>
    private void AddFollow(string followerId, string followedId, int day)
        => _factory.FollowService.Follows.Add(new Follow
        {
            FollowerId = followerId,
            FollowedId = followedId,
            CreatedAt = new DateTime(2026, 3, day, 0, 0, 0, DateTimeKind.Utc)
        });

    /// <summary>
    /// The followers of a user are their id, name and avatar, the most recent follow first, without the follows of other
    /// users.
    /// </summary>
    [Fact]
    public async Task GetFollowers_ReturnsFollowersMostRecentFirst()
    {
        AddFollow(MeId, CamilleId, day: 1);
        AddFollow(HugoId, CamilleId, day: 5);
        AddFollow(CamilleId, HugoId, day: 9);

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Get, $"/api/users/{CamilleId}/followers");

        Assert.Equal([new UserSummaryResponse(HugoId, "hugo", null), new UserSummaryResponse(MeId, "alexis", null)], followers);
    }

    /// <summary>
    /// The users listed have no number of restaurants rated, even when they rated some: counting them would read the
    /// ratings of every user listed.
    /// </summary>
    [Theory]
    [InlineData("followers")]
    [InlineData("following")]
    public async Task GetList_UsersHaveNoRestaurantsCount(string list)
    {
        AddFollow(HugoId, MeId, day: 1);
        AddFollow(MeId, HugoId, day: 2);
        _factory.RatingService.Ratings.Add(new Rating { RestaurantId = "r1", UserId = HugoId, Date = DateTimeOffset.UtcNow, IsActive = true });

        HttpResponseMessage response = await SendAsync(HttpMethod.Get, $"/api/users/{MeId}/{list}");

        string json = await response.Content.ReadAsStringAsync();
        Assert.Contains($"\"id\":\"{HugoId}\"", json);
        Assert.DoesNotContain("ratedRestaurantsCount", json);
    }

    /// <summary>
    /// The users a user follows are their profiles, the most recent follow first, without the follows of other users.
    /// </summary>
    [Fact]
    public async Task GetFollowing_ReturnsFollowedUsersMostRecentFirst()
    {
        AddFollow(MeId, CamilleId, day: 1);
        AddFollow(MeId, HugoId, day: 5);
        AddFollow(CamilleId, MeId, day: 9);

        List<UserSummaryResponse> following = await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/following");

        Assert.Equal(["hugo", "camille"], following.Select(u => u.Name));
        Assert.Equal("https://img.test/camille.png", following[1].AvatarUrl);
    }

    /// <summary>
    /// A follower without profile row is listed as anonymous rather than left out.
    /// </summary>
    [Fact]
    public async Task GetFollowers_FollowerWithoutProfile_ListedAsAnonymous()
    {
        AddFollow(UnknownId, CamilleId, day: 1);

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Get, $"/api/users/{CamilleId}/followers");

        Assert.Equal(new UserSummaryResponse(UnknownId, Profile.AnonymousName, null), Assert.Single(followers));
    }

    /// <summary>
    /// A user nobody follows, and who follows nobody, has empty lists rather than a 404.
    /// </summary>
    [Theory]
    [InlineData("followers")]
    [InlineData("following")]
    public async Task GetList_NoFollow_ReturnsEmptyList(string list)
    {
        AddFollow(MeId, CamilleId, day: 1);

        Assert.Empty(await ProfilesAsync(HttpMethod.Get, $"/api/users/{HugoId}/{list}"));
    }

    /// <summary>
    /// Following a user adds the logged-in user to their followers, answered at once, and the user to the logged-in
    /// user's following.
    /// </summary>
    [Fact]
    public async Task Follow_AddsLoggedInUserToFollowers()
    {
        AddFollow(HugoId, CamilleId, day: 1);

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Put, $"/api/users/{CamilleId}/follow");

        Assert.Equal(["alexis", "hugo"], followers.Select(u => u.Name));
        Assert.Equal([CamilleId], (await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/following")).Select(u => u.Id));
    }

    /// <summary>
    /// Following a user followed back: both users follow each other, each one listed once.
    /// </summary>
    [Fact]
    public async Task Follow_UserFollowingMe_BothFollowEachOther()
    {
        AddFollow(CamilleId, MeId, day: 1);

        await ProfilesAsync(HttpMethod.Put, $"/api/users/{CamilleId}/follow");

        Assert.Equal([CamilleId], (await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/followers")).Select(u => u.Id));
        Assert.Equal([CamilleId], (await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/following")).Select(u => u.Id));
    }

    /// <summary>
    /// Following a user already followed changes nothing and succeeds: the logged-in user is listed once.
    /// </summary>
    [Fact]
    public async Task Follow_Twice_FollowsOnce()
    {
        await ProfilesAsync(HttpMethod.Put, $"/api/users/{CamilleId}/follow");

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Put, $"/api/users/{CamilleId}/follow");

        Assert.Equal(MeId, Assert.Single(followers).Id);
        Assert.Single(_factory.FollowService.Follows);
    }

    /// <summary>
    /// A user cannot follow themselves, even with their id in capitals, and nothing is saved.
    /// </summary>
    [Theory]
    [InlineData("aaaaaaaa-0000-0000-0000-000000000000")]
    [InlineData("AAAAAAAA-0000-0000-0000-000000000000")]
    public async Task Follow_OwnId_Returns400(string userId)
    {
        const string ownId = "aaaaaaaa-0000-0000-0000-000000000000";
        _factory.RatingService.Profiles[ownId] = new Profile { Id = ownId, Username = "anna" };
        _factory.AuthService.UserIdsByToken[Token] = ownId;

        HttpResponseMessage response = await SendAsync(HttpMethod.Put, $"/api/users/{userId}/follow");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(FollowService.CannotFollowYourself.Message, await response.Content.ReadAsStringAsync());
        Assert.Empty(_factory.FollowService.Follows);
    }

    /// <summary>
    /// A uuid no user has cannot be followed: 404, and nothing is saved.
    /// </summary>
    [Fact]
    public async Task Follow_UnknownUser_Returns404()
    {
        HttpResponseMessage response = await SendAsync(HttpMethod.Put, $"/api/users/{UnknownId}/follow");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(_factory.FollowService.Follows);
    }

    /// <summary>
    /// Unfollowing a user removes the logged-in user from their followers, answered at once, and keeps the other
    /// follows (of the user, and of the logged-in user).
    /// </summary>
    [Fact]
    public async Task Unfollow_RemovesLoggedInUserFromFollowers()
    {
        AddFollow(MeId, CamilleId, day: 1);
        AddFollow(HugoId, CamilleId, day: 2);
        AddFollow(MeId, HugoId, day: 3);
        AddFollow(CamilleId, MeId, day: 4);

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Delete, $"/api/users/{CamilleId}/follow");

        Assert.Equal([HugoId], followers.Select(u => u.Id));
        Assert.Equal([HugoId], (await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/following")).Select(u => u.Id));
        Assert.Equal([CamilleId], (await ProfilesAsync(HttpMethod.Get, $"/api/users/{MeId}/followers")).Select(u => u.Id));
    }

    /// <summary>
    /// Unfollowing a user not followed changes nothing and succeeds.
    /// </summary>
    [Fact]
    public async Task Unfollow_NotFollowed_ReturnsFollowersUnchanged()
    {
        AddFollow(HugoId, CamilleId, day: 1);

        List<UserSummaryResponse> followers = await ProfilesAsync(HttpMethod.Delete, $"/api/users/{CamilleId}/follow");

        Assert.Equal([HugoId], followers.Select(u => u.Id));
    }

    /// <summary>
    /// Every follow endpoint, as (method, path after the user id).
    /// </summary>
    public static TheoryData<string, string> Endpoints => new()
    {
        { "GET", "followers" },
        { "GET", "following" },
        { "PUT", "follow" },
        { "DELETE", "follow" }
    };

    /// <summary>
    /// An id that is not a user id, "me" included, returns a 404 on every endpoint.
    /// </summary>
    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task NotAUserId_Returns404(string method, string path)
    {
        foreach (string userId in new[] { "alex", "me" })
        {
            HttpResponseMessage response = await SendAsync(new HttpMethod(method), $"/api/users/{userId}/{path}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }

    /// <summary>
    /// Without the auth cookie, every endpoint is refused with a 401, and nothing is saved.
    /// </summary>
    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task NoCookie_Returns401(string method, string path)
    {
        AddFollow(MeId, CamilleId, day: 1);

        HttpResponseMessage response = await SendAsync(new HttpMethod(method), $"/api/users/{CamilleId}/{path}", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Single(_factory.FollowService.Follows);
    }

    /// <summary>
    /// The controller refuses a null service instead of failing on the first request.
    /// </summary>
    [Fact]
    public void Constructor_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new FollowsController(null!));
    }
}
