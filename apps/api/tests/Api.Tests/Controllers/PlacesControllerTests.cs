using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Services.Places;

namespace Api.Tests.Controllers;

/// <summary>
/// Tests the /api/places endpoints through HTTP, with a fake place provider.
/// </summary>
public class PlacesControllerTests : IDisposable
{
    /// <summary>
    /// In-memory API, recreated for each test so the rate limiter starts empty.
    /// </summary>
    private readonly ApiFactory _factory = new();

    /// <summary>
    /// Client sending requests to <see cref="_factory"/>.
    /// </summary>
    private readonly HttpClient _client;

    /// <summary>
    /// Creates the client for the test.
    /// </summary>
    public PlacesControllerTests()
    {
        _client = _factory.CreateClient();
    }

    /// <summary>
    /// Disposes the in-memory API.
    /// </summary>
    public void Dispose() => _factory.Dispose();

    /// <summary>
    /// Autocomplete returns the ranked suggestions as JSON.
    /// </summary>
    [Fact]
    public async Task Autocomplete_ReturnsSuggestions()
    {
        _factory.PlaceProvider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Success(
            [new PlaceDetails("N1", "Pizza Roma", "1 rue de Caen", 49.18, -0.37)]);

        HttpResponseMessage response = await _client.GetAsync("/api/places/autocomplete?input=pizza");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<PlaceSuggestion>? suggestions = await response.Content.ReadFromJsonAsync<List<PlaceSuggestion>>();
        Assert.Equal([new PlaceSuggestion("N1", "Pizza Roma", "1 rue de Caen")], suggestions);
    }

    /// <summary>
    /// An unavailable provider becomes a 503.
    /// </summary>
    [Fact]
    public async Task Search_ProviderUnavailable_Returns503()
    {
        _factory.PlaceProvider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Failure(new Error(ErrorType.Unavailable, "down"));

        HttpResponseMessage response = await _client.GetAsync("/api/places/search?query=pizza");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    /// <summary>
    /// The places endpoints are limited to 30 requests per minute, to protect the free OSM services.
    /// </summary>
    [Fact]
    public async Task Autocomplete_MoreThan30RequestsPerMinute_Returns429()
    {
        for (int i = 0; i < 30; i++)
        {
            HttpResponseMessage allowed = await _client.GetAsync("/api/places/autocomplete?input=ab");
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        HttpResponseMessage rejected = await _client.GetAsync("/api/places/autocomplete?input=ab");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }
}
