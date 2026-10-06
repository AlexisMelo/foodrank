using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests POST /api/restaurants/{id}/ratings through HTTP, with in-memory auth, restaurant and rating services.
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
}
