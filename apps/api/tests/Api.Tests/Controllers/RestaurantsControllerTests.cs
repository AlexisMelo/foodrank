using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api.Common;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/restaurants endpoints through HTTP, with an in-memory restaurant service.
/// </summary>
public class RestaurantsControllerTests : IDisposable
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
    /// In-memory API, recreated for each test so restaurants do not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client for the test and a valid token for the logged-in user.
    /// </summary>
    public RestaurantsControllerTests()
    {
        _client = _factory.CreateClient();
        _factory.AuthService.UserIdsByToken[Token] = MeId;
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// An existing restaurant is returned with a 200.
    /// </summary>
    [Fact]
    public async Task GetById_Existing_Returns200()
    {
        _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = "r1", Name = "Pizza Roma" });

        HttpResponseMessage response = await _client.GetAsync("/api/restaurants/r1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Pizza Roma", await response.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// An unknown restaurant returns a 404.
    /// </summary>
    [Fact]
    public async Task GetById_Unknown_Returns404()
    {
        HttpResponseMessage response = await _client.GetAsync("/api/restaurants/unknown");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// Selecting a place returns its restaurant, created on first selection only, and tells which call created it.
    /// </summary>
    [Fact]
    public async Task FromPlace_CalledTwice_CreatesRestaurantOnce()
    {
        HttpResponseMessage first = await _client.PostAsJsonAsync("/api/restaurants/from-place", new { placeId = "N42" });
        HttpResponseMessage second = await _client.PostAsJsonAsync("/api/restaurants/from-place", new { placeId = "N42" });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Restaurant stored = Assert.Single(_factory.RestaurantService.Restaurants);
        Assert.Contains("\"created\":true", await first.Content.ReadAsStringAsync());
        string secondBody = await second.Content.ReadAsStringAsync();
        Assert.Contains("\"created\":false", secondBody);
        Assert.Contains($"\"id\":\"{stored.Id}\"", secondBody);
    }

    /// <summary>
    /// The suggestions are personal: a visitor who is not logged in gets a 401.
    /// </summary>
    [Fact]
    public async Task GetSuggestions_NotLoggedIn_Returns401()
    {
        HttpResponseMessage response = await GetAsync("/api/restaurants/suggestions", token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// From the user's position, the restaurants they have not rated come nearest first with their distance. Another
    /// user's rating does not leave a restaurant out.
    /// </summary>
    [Fact]
    public async Task GetSuggestions_WithPosition_ReturnsUnratedRestaurantsNearestFirst()
    {
        AddRestaurant("paris", 48.85, 2.35);
        AddRestaurant("visited", 49.18, -0.37);
        AddRestaurant("near", 49.185, -0.37);
        AddRestaurant("rated-by-other", 49.19, -0.37);
        AddRating(MeId, "visited", isActive: false);
        AddRating(MeId, "visited", isActive: true);
        AddRating(OtherId, "rated-by-other", isActive: true);

        HttpResponseMessage response = await GetAsync("/api/restaurants/suggestions?lat=49.18&lon=-0.37");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<(string Id, double? DistanceKm)> suggestions = await ReadSuggestionsAsync(response);
        Assert.Equal(["near", "rated-by-other", "paris"], suggestions.Select(s => s.Id));
        Assert.Equal(0.556, suggestions[0].DistanceKm!.Value, precision: 3);
    }

    /// <summary>
    /// Without a position, the restaurants are sorted from the default city (Paris in the tests), without distance.
    /// </summary>
    [Fact]
    public async Task GetSuggestions_WithoutPosition_SortsFromDefaultCityWithoutDistance()
    {
        AddRestaurant("caen", 49.18, -0.37);
        AddRestaurant("paris", 48.85, 2.35);

        HttpResponseMessage response = await GetAsync("/api/restaurants/suggestions");

        List<(string Id, double? DistanceKm)> suggestions = await ReadSuggestionsAsync(response);
        Assert.Equal(["paris", "caen"], suggestions.Select(s => s.Id));
        Assert.All(suggestions, s => Assert.Null(s.DistanceKm));
    }

    /// <summary>
    /// At most <c>limit</c> suggestions are returned, 5 by default.
    /// </summary>
    [Theory]
    [InlineData("", 5)]
    [InlineData("&limit=2", 2)]
    public async Task GetSuggestions_ReturnsAtMostLimit(string limitParam, int expectedCount)
    {
        for (int i = 0; i < 6; i++)
            AddRestaurant($"r{i}", 49.18 + i * 0.01, -0.37);

        HttpResponseMessage response = await GetAsync($"/api/restaurants/suggestions?lat=49.18&lon=-0.37{limitParam}");

        Assert.Equal(expectedCount, (await ReadSuggestionsAsync(response)).Count);
    }

    /// <summary>
    /// A limit outside 1-50 is rejected with a 400.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public async Task GetSuggestions_LimitOutOfRange_Returns400(int limit)
    {
        HttpResponseMessage response = await GetAsync($"/api/restaurants/suggestions?limit={limit}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
    /// Stores the restaurant <paramref name="id"/> at (<paramref name="lat"/>, <paramref name="lng"/>).
    /// </summary>
    private void AddRestaurant(string id, double lat, double lng)
        => _factory.RestaurantService.Restaurants.Add(new Restaurant { Id = id, Name = id, Lat = lat, Lng = lng });

    /// <summary>
    /// Stores a rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, a day apart from the previous one.
    /// </summary>
    private void AddRating(string userId, string restaurantId, bool isActive)
        => _factory.RatingService.Ratings.Add(new Rating
        {
            RestaurantId = restaurantId,
            UserId = userId,
            Date = DateTimeOffset.UtcNow.AddDays(-_factory.RatingService.Ratings.Count - 1),
            IsActive = isActive
        });

    /// <summary>
    /// Reads the id and distance of each suggestion of the response, in order.
    /// </summary>
    private static async Task<List<(string Id, double? DistanceKm)>> ReadSuggestionsAsync(HttpResponseMessage response)
    {
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.EnumerateArray()
            .Select(s => (
                s.GetProperty("restaurant").GetProperty("id").GetString()!,
                s.GetProperty("distanceKm").ValueKind == JsonValueKind.Null ? (double?)null : s.GetProperty("distanceKm").GetDouble()))
            .ToList();
    }
}
