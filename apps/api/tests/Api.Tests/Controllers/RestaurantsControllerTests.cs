using System.Net;
using System.Net.Http.Json;
using api.Models;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/restaurants endpoints through HTTP, with an in-memory restaurant service.
/// </summary>
public class RestaurantsControllerTests : IDisposable
{
    /// <summary>
    /// In-memory API, recreated for each test so restaurants do not leak between tests.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client for the test.
    /// </summary>
    public RestaurantsControllerTests()
    {
        _client = _factory.CreateClient();
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
}
