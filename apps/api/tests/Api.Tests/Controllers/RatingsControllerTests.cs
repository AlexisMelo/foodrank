using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Controllers;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/restaurants/{id}/ratings endpoints through HTTP, with in-memory auth, restaurant and rating services.
/// </summary>
public class RatingsControllerTests : IDisposable
{
    /// <summary>
    /// Valid access token of <see cref="UserId"/>.
    /// </summary>
    private const string Token = "valid-token";

    /// <summary>
    /// Id of the logged-in user.
    /// </summary>
    private const string UserId = "user-1";

    /// <summary>
    /// Id of the restaurant existing in every test.
    /// </summary>
    private const string RestaurantId = "r1";

    /// <summary>
    /// In-memory API, recreated for each test so ratings do not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client, a restaurant and a valid token.
    /// </summary>
    public RatingsControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = RestaurantId, Name = "Pizza Roma" });
        _factory.AuthService.UserIdsByToken[Token] = UserId;
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Sends a rating of <paramref name="restaurantId"/>, with the auth cookie when <paramref name="token"/> is given.
    /// </summary>
    private Task<HttpResponseMessage> RateAsync(string restaurantId, object body, string? token = Token)
    {
        HttpRequestMessage request = new(HttpMethod.Post, $"/api/restaurants/{restaurantId}/ratings")
        {
            Content = JsonContent.Create(body)
        };
        if (token is not null)
            request.Headers.Add("Cookie", $"{SupabaseAuthenticationHandler.CookieName}={token}");
        return _client.SendAsync(request);
    }

    /// <summary>
    /// A valid rating from a logged-in user is saved with the user's id and the bonus.
    /// </summary>
    [Fact]
    public async Task Create_LoggedIn_SavesRatingForUser()
    {
        HttpResponseMessage response = await RateAsync(RestaurantId, new { food = 80, service = 60.5, setting = 40, bonus = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Rating rating = Assert.Single(_factory.RatingService.Ratings);
        Assert.Equal(RestaurantId, rating.RestaurantId);
        Assert.Equal(UserId, rating.UserId);
        Assert.Equal(80, rating.FoodRating);
        Assert.Equal(60.5f, rating.ServiceRating);
        Assert.Equal(40, rating.SettingRating);
        Assert.True(rating.Bonus);
    }

    /// <summary>
    /// Without the auth cookie, the rating is refused with a 401.
    /// </summary>
    [Fact]
    public async Task Create_NoCookie_Returns401()
    {
        HttpResponseMessage response = await RateAsync(RestaurantId, new { food = 50, service = 50, setting = 50, bonus = false }, token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.RatingService.Ratings);
    }

    /// <summary>
    /// With an expired or unknown token, the rating is refused with a 401.
    /// </summary>
    [Fact]
    public async Task Create_InvalidToken_Returns401()
    {
        HttpResponseMessage response = await RateAsync(RestaurantId, new { food = 50, service = 50, setting = 50, bonus = false }, token: "expired");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.RatingService.Ratings);
    }

    /// <summary>
    /// A rating outside 0-100 is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(101, 50, 50)]
    [InlineData(50, -1, 50)]
    [InlineData(50, 50, 150)]
    public async Task Create_OutOfRange_Returns400(float food, float service, float setting)
    {
        HttpResponseMessage response = await RateAsync(RestaurantId, new { food, service, setting, bonus = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(_factory.RatingService.Ratings);
    }

    /// <summary>
    /// Rating an unknown restaurant returns a 404.
    /// </summary>
    [Fact]
    public async Task Create_UnknownRestaurant_Returns404()
    {
        HttpResponseMessage response = await RateAsync("unknown", new { food = 50, service = 50, setting = 50, bonus = false });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// A second rating of the same restaurant the same day is refused with a 409 and does not replace the first one.
    /// </summary>
    [Fact]
    public async Task Create_TwiceSameDay_Returns409()
    {
        await RateAsync(RestaurantId, new { food = 80, service = 80, setting = 80, bonus = false });
        HttpResponseMessage response = await RateAsync(RestaurantId, new { food = 10, service = 10, setting = 10, bonus = false });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("already rated", await response.Content.ReadAsStringAsync());
        Assert.Equal(80, Assert.Single(_factory.RatingService.Ratings).FoodRating);
    }

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
    /// Stores a rating of <paramref name="restaurantId"/> by <paramref name="userId"/> on <paramref name="date"/>,
    /// active unless <paramref name="isActive"/> is false.
    /// </summary>
    private void AddRating(string userId, DateTime date, float food = 50, string restaurantId = RestaurantId, bool isActive = true)
        => _factory.RatingService.Ratings.Add(new Rating
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = date,
            FoodRating = food,
            ServiceRating = 50,
            SettingRating = 50,
            IsActive = isActive
        });

    /// <summary>
    /// Without limit, the 5 most recent ratings of the restaurant are returned, every user included, most recent first,
    /// even to an anonymous visitor.
    /// </summary>
    [Fact]
    public async Task GetRecent_Anonymous_ReturnsFiveMostRecentOfRestaurant()
    {
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r2", Name = "Sushi Bar" });
        for (int day = 1; day <= 7; day++)
            AddRating(day % 2 == 0 ? UserId : "user-2", new DateTime(2026, 3, day));
        AddRating("user-2", new DateTime(2026, 3, 20), restaurantId: "r2");

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings", token: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<RatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!;
        Assert.Equal(["2026-03-07", "2026-03-06", "2026-03-05", "2026-03-04", "2026-03-03"], ratings.Select(r => r.Date));
        Assert.All(ratings, r => Assert.Equal(RestaurantId, r.RestaurantId));
    }

    /// <summary>
    /// The limit query parameter changes the number of ratings returned.
    /// </summary>
    [Fact]
    public async Task GetRecent_WithLimit_ReturnsThatMany()
    {
        for (int day = 1; day <= 4; day++)
            AddRating("user-2", new DateTime(2026, 3, day));

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings?limit=2");

        List<RatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!;
        Assert.Equal(2, ratings.Count);
    }

    /// <summary>
    /// A limit outside 1-50 is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public async Task GetRecent_LimitOutOfRange_Returns400(int limit)
    {
        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings?limit={limit}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Each rating carries the name and avatar of its author's profile, in camelCase for the frontend.
    /// </summary>
    [Fact]
    public async Task GetRecent_WithProfile_ReturnsAuthorName()
    {
        _factory.RatingService.Profiles["user-2"] = new Profile { Id = "user-2", FullName = "Camille", AvatarUrl = "https://img.test/c.png" };
        AddRating("user-2", new DateTime(2026, 3, 1), food: 72.5f);

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings");

        string json = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"userName\":\"Camille\"", json);
        Assert.Contains("\"userAvatarUrl\":\"https://img.test/c.png\"", json);
        Assert.Contains("\"food\":72.5", json);
        Assert.Contains("\"date\":\"2026-03-01\"", json);
    }

    /// <summary>
    /// Only the active rating of each user is returned, and the limit counts active ratings only (the previous ratings
    /// do not take the place of other users' ones); the flag is sent in camelCase for the frontend.
    /// </summary>
    [Fact]
    public async Task GetRecent_UserRatedSeveralTimes_ReturnsOnlyActiveRatings()
    {
        AddRating("user-3", new DateTime(2026, 3, 1));
        AddRating(UserId, new DateTime(2026, 3, 2));
        AddRating("user-2", new DateTime(2026, 3, 3), isActive: false);
        AddRating("user-2", new DateTime(2026, 3, 4), isActive: false);
        AddRating("user-2", new DateTime(2026, 3, 5));

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings?limit=3");

        List<RatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!;
        Assert.Equal([("user-2", "2026-03-05"), (UserId, "2026-03-02"), ("user-3", "2026-03-01")], ratings.Select(r => (r.UserId, r.Date)));
        Assert.All(ratings, r => Assert.True(r.IsActive));
        Assert.Contains("\"isActive\":true", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// Right after a new rating, "Recent" shows it in place of the user's previous one.
    /// </summary>
    [Fact]
    public async Task GetRecent_AfterNewRating_ReplacesPreviousOne()
    {
        AddRating(UserId, new DateTime(2026, 3, 1), food: 20);
        await RateAsync(RestaurantId, new { food = 91, service = 70, setting = 30, bonus = false });

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings");

        RatingResponse rating = Assert.Single((await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!);
        Assert.Equal(91, rating.Food);
    }

    /// <summary>
    /// Recent ratings of an unknown restaurant return a 404.
    /// </summary>
    [Fact]
    public async Task GetRecent_UnknownRestaurant_Returns404()
    {
        HttpResponseMessage response = await GetAsync("/api/restaurants/unknown/ratings");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// "Mine" returns every rating of the logged-in user for the restaurant (no limit), most recent first, and none of
    /// the other users' or other restaurants'.
    /// </summary>
    [Fact]
    public async Task GetMine_LoggedIn_ReturnsAllOwnRatingsOfRestaurant()
    {
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r2", Name = "Sushi Bar" });
        for (int day = 1; day <= 6; day++)
            AddRating(UserId, new DateTime(2026, 3, day));
        AddRating("user-2", new DateTime(2026, 3, 10));
        AddRating(UserId, new DateTime(2026, 3, 11), restaurantId: "r2");

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings/mine");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<RatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!;
        Assert.Equal(6, ratings.Count);
        Assert.All(ratings, r => Assert.Equal(UserId, r.UserId));
        Assert.All(ratings, r => Assert.Equal(RestaurantId, r.RestaurantId));
        Assert.Equal("2026-03-06", ratings[0].Date);
    }

    /// <summary>
    /// A rating just created is returned by "mine", so the restaurant page shows it right after the rating page.
    /// </summary>
    [Fact]
    public async Task GetMine_AfterCreate_ReturnsNewRating()
    {
        await RateAsync(RestaurantId, new { food = 91, service = 70, setting = 30, bonus = true });

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings/mine");

        RatingResponse rating = Assert.Single((await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!);
        Assert.Equal(91, rating.Food);
        Assert.True(rating.Bonus);
    }

    /// <summary>
    /// A new rating becomes the active one: the previous rating is still returned, but inactive, and the other users'
    /// and restaurants' active ratings are untouched.
    /// </summary>
    [Fact]
    public async Task GetMine_AfterNewRating_NewOneIsActiveAndPreviousIsKept()
    {
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r2", Name = "Sushi Bar" });
        AddRating(UserId, new DateTime(2026, 3, 1), food: 20);
        AddRating("user-2", new DateTime(2026, 3, 1));
        AddRating(UserId, new DateTime(2026, 3, 1), restaurantId: "r2");
        await RateAsync(RestaurantId, new { food = 91, service = 70, setting = 30, bonus = false });

        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings/mine");

        List<RatingResponse> ratings = (await response.Content.ReadFromJsonAsync<List<RatingResponse>>())!;
        Assert.Equal([(91f, true), (20f, false)], ratings.Select(r => (r.Food, r.IsActive)));
        Assert.Equal(3, _factory.RatingService.Ratings.Count(r => r.IsActive));
    }

    /// <summary>
    /// Without the auth cookie, "mine" is refused with a 401.
    /// </summary>
    [Fact]
    public async Task GetMine_NoCookie_Returns401()
    {
        HttpResponseMessage response = await GetAsync($"/api/restaurants/{RestaurantId}/ratings/mine", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// "Mine" for an unknown restaurant returns a 404.
    /// </summary>
    [Fact]
    public async Task GetMine_UnknownRestaurant_Returns404()
    {
        HttpResponseMessage response = await GetAsync("/api/restaurants/unknown/ratings/mine");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// The controller refuses a null service instead of failing on the first request.
    /// </summary>
    [Fact]
    public void Constructor_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new RatingsController(null!));
    }
}
