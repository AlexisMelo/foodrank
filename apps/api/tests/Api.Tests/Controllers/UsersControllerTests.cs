using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Controllers;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/users endpoints through HTTP, with in-memory auth, restaurant, rating and user services.
/// </summary>
public class UsersControllerTests : IDisposable
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
    /// Id of another user.
    /// </summary>
    private const string OtherId = "22222222-2222-2222-2222-222222222222";

    /// <summary>
    /// In-memory API, recreated for each test so data does not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client, two restaurants, the logged-in user's profile and a valid token.
    /// </summary>
    public UsersControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r1", Name = "Pizza Roma", Emoji = "🍕", Cuisine = "Italian" });
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r2", Name = "Sushi Bar", Emoji = "🍣" });
        _factory.RatingService.Profiles[MeId] = new Profile { Id = MeId, FullName = "Alexis Melo", AvatarUrl = "https://img.test/me.png" };
        _factory.AuthService.UserIdsByToken[Token] = MeId;
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Sends a GET to <paramref name="url"/>, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> GetAsync(string url, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Get, url);
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// Stores a rating of <paramref name="restaurantId"/> by <paramref name="userId"/> on <paramref name="date"/>.
    /// </summary>
    private void AddRating(string userId, string restaurantId, DateTime date, float food = 50)
        => _factory.RatingService.Ratings.Add(new Rating
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = date,
            FoodRating = food,
            ServiceRating = 60,
            SettingRating = 70
        });

    /// <summary>
    /// "me" returns the logged-in user's name and avatar, and counts each restaurant rated once.
    /// </summary>
    [Fact]
    public async Task GetMe_LoggedIn_ReturnsProfileWithDistinctRestaurantsCount()
    {
        AddRating(MeId, "r1", new DateTime(2026, 3, 1));
        AddRating(MeId, "r1", new DateTime(2026, 3, 2));
        AddRating(MeId, "r2", new DateTime(2026, 3, 3));
        AddRating(OtherId, "r1", new DateTime(2026, 3, 4));

        HttpResponseMessage response = await GetAsync("/api/users/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string json = await response.Content.ReadAsStringAsync();
        Assert.Contains($"\"id\":\"{MeId}\"", json);
        Assert.Contains("\"name\":\"Alexis Melo\"", json);
        Assert.Contains("\"avatarUrl\":\"https://img.test/me.png\"", json);
        Assert.Contains("\"ratedRestaurantsCount\":2", json);
    }

    /// <summary>
    /// Without the auth cookie, "me" is refused with a 401.
    /// </summary>
    [Fact]
    public async Task GetMe_NoCookie_Returns401()
    {
        HttpResponseMessage response = await GetAsync("/api/users/me", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// A logged-in user without profile row is returned as anonymous rather than failing.
    /// </summary>
    [Fact]
    public async Task GetMe_NoProfileRow_ReturnsAnonymous()
    {
        _factory.RatingService.Profiles.Clear();

        UserProfileResponse profile = (await (await GetAsync("/api/users/me")).Content.ReadFromJsonAsync<UserProfileResponse>())!;

        Assert.Equal(Profile.AnonymousName, profile.Name);
        Assert.Equal(0, profile.RatedRestaurantsCount);
    }

    /// <summary>
    /// The profile of another user is returned by its id.
    /// </summary>
    [Fact]
    public async Task GetById_OtherUser_ReturnsItsProfile()
    {
        _factory.RatingService.Profiles[OtherId] = new Profile { Id = OtherId, Username = "camille" };
        AddRating(OtherId, "r2", new DateTime(2026, 3, 4));

        UserProfileResponse profile = (await (await GetAsync($"/api/users/{OtherId}")).Content.ReadFromJsonAsync<UserProfileResponse>())!;

        Assert.Equal(OtherId, profile.Id);
        Assert.Equal("camille", profile.Name);
        Assert.Equal(1, profile.RatedRestaurantsCount);
    }

    /// <summary>
    /// An id that is not a user id returns a 404, for the profile and the ratings.
    /// </summary>
    [Theory]
    [InlineData("/api/users/alex")]
    [InlineData("/api/users/alex/ratings")]
    [InlineData("/api/users/alex/tierlists")]
    public async Task GetById_NotAUserId_Returns404(string url)
    {
        HttpResponseMessage response = await GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// "me/ratings" returns all the logged-in user's ratings, most recent first, with their restaurant, and none of
    /// the other users'.
    /// </summary>
    [Fact]
    public async Task GetMyRatings_LoggedIn_ReturnsOwnRatingsWithRestaurant()
    {
        AddRating(MeId, "r1", new DateTime(2026, 3, 1), food: 90);
        AddRating(MeId, "r2", new DateTime(2026, 3, 5), food: 40);
        AddRating(OtherId, "r1", new DateTime(2026, 3, 9));

        HttpResponseMessage response = await GetAsync("/api/users/me/ratings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<UserRatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<UserRatingResponse>>())!;
        Assert.Equal(["2026-03-05", "2026-03-01"], ratings.Select(r => r.Date));
        UserRatingResponse pizza = ratings[1];
        Assert.Equal("r1", pizza.RestaurantId);
        Assert.Equal("Pizza Roma", pizza.RestaurantName);
        Assert.Equal("🍕", pizza.RestaurantEmoji);
        Assert.Equal("Italian", pizza.RestaurantCuisine);
        Assert.Equal(90, pizza.Food);
        Assert.Equal(60, pizza.Service);
        Assert.Equal(70, pizza.Setting);
    }

    /// <summary>
    /// Without the auth cookie, "me/ratings" is refused with a 401.
    /// </summary>
    [Fact]
    public async Task GetMyRatings_NoCookie_Returns401()
    {
        HttpResponseMessage response = await GetAsync("/api/users/me/ratings", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// The ratings of another user are returned by its id.
    /// </summary>
    [Fact]
    public async Task GetRatings_OtherUser_ReturnsItsRatings()
    {
        AddRating(MeId, "r1", new DateTime(2026, 3, 1));
        AddRating(OtherId, "r2", new DateTime(2026, 3, 2));

        List<UserRatingResponse> ratings = (await (await GetAsync($"/api/users/{OtherId}/ratings")).Content.ReadFromJsonAsync<List<UserRatingResponse>>())!;

        Assert.Equal("r2", Assert.Single(ratings).RestaurantId);
    }

    /// <summary>
    /// A user who never rated has an empty list rather than a 404.
    /// </summary>
    [Fact]
    public async Task GetRatings_NoRating_ReturnsEmptyList()
    {
        HttpResponseMessage response = await GetAsync($"/api/users/{OtherId}/ratings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<List<UserRatingResponse>>())!);
    }

    /// <summary>
    /// Stores a tierlist of <paramref name="userId"/> created on <paramref name="createdAt"/>.
    /// </summary>
    private Tierlist AddTierlist(string userId, string name, DateTime createdAt, bool pinned = false)
    {
        Tierlist tierlist = new()
        {
            Id = _factory.TierlistService.Tierlists.Count + 1,
            UserId = userId,
            Name = name,
            Emoji = "🏆",
            Pinned = pinned,
            CreatedAt = createdAt
        };
        _factory.TierlistService.Tierlists.Add(tierlist);
        return tierlist;
    }

    /// <summary>
    /// "me/tierlists" returns the logged-in user's tierlists, most recently created first, with their restaurants, and
    /// none of the other users'.
    /// </summary>
    [Fact]
    public async Task GetMyTierlists_LoggedIn_ReturnsOwnTierlistsNewestFirst()
    {
        Tierlist old = AddTierlist(MeId, "Old favorites", new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), pinned: true);
        AddTierlist(MeId, "Fresh picks", new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc));
        AddTierlist(OtherId, "Not mine", new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc));
        _factory.TierlistService.Restaurants.Add(new TierlistRestaurant { TierlistId = old.Id, RestaurantId = "r1" });

        HttpResponseMessage response = await GetAsync("/api/users/me/tierlists");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<TierlistResponse> tierlists = (await response.Content.ReadFromJsonAsync<List<TierlistResponse>>())!;
        Assert.Equal(["Fresh picks", "Old favorites"], tierlists.Select(t => t.Name));
        Assert.All(tierlists, t => Assert.Equal(MeId, t.UserId));
        Assert.Equal("r1", Assert.Single(tierlists[1].Restaurants).RestaurantId);
        Assert.Empty(tierlists[0].Restaurants);
        Assert.True(tierlists[1].Pinned);
    }

    /// <summary>
    /// A tierlist just created is returned by "me/tierlists", so the tierlists page shows it right after creation.
    /// </summary>
    [Fact]
    public async Task GetMyTierlists_AfterCreate_ReturnsNewTierlist()
    {
        AddTierlist(MeId, "Old favorites", new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        HttpRequestMessage create = new(HttpMethod.Post, "/api/tierlists")
        {
            Content = JsonContent.Create(new { emoji = "🍣", name = "Sushi spots", pinned = true })
        };
        create.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={Token}");
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(create)).StatusCode);

        List<TierlistResponse> tierlists = (await (await GetAsync("/api/users/me/tierlists")).Content.ReadFromJsonAsync<List<TierlistResponse>>())!;

        Assert.Equal(["Sushi spots", "Old favorites"], tierlists.Select(t => t.Name));
        Assert.Equal("🍣", tierlists[0].Emoji);
        Assert.True(tierlists[0].Pinned);
    }

    /// <summary>
    /// Without the auth cookie, "me/tierlists" is refused with a 401.
    /// </summary>
    [Fact]
    public async Task GetMyTierlists_NoCookie_Returns401()
    {
        HttpResponseMessage response = await GetAsync("/api/users/me/tierlists", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// The tierlists of another user are returned by its id.
    /// </summary>
    [Fact]
    public async Task GetTierlists_OtherUser_ReturnsItsTierlists()
    {
        AddTierlist(MeId, "Mine", new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        AddTierlist(OtherId, "Camille's", new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc));

        List<TierlistResponse> tierlists = (await (await GetAsync($"/api/users/{OtherId}/tierlists")).Content.ReadFromJsonAsync<List<TierlistResponse>>())!;

        Assert.Equal("Camille's", Assert.Single(tierlists).Name);
    }

    /// <summary>
    /// A user without tierlist has an empty list rather than a 404.
    /// </summary>
    [Fact]
    public async Task GetTierlists_NoTierlist_ReturnsEmptyList()
    {
        HttpResponseMessage response = await GetAsync($"/api/users/{OtherId}/tierlists");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<List<TierlistResponse>>())!);
    }

    /// <summary>
    /// The controller refuses a null service instead of failing on the first request.
    /// </summary>
    [Fact]
    public void Constructor_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new UsersController(null!, _factory.RatingService, _factory.TierlistService));
        Assert.Throws<ArgumentNullException>(() => new UsersController(_factory.UserService, null!, _factory.TierlistService));
        Assert.Throws<ArgumentNullException>(() => new UsersController(_factory.UserService, _factory.RatingService, null!));
    }
}
