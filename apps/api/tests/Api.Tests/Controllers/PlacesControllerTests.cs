using System.Net;
using System.Net.Http.Json;
using api.Common;
using api.Models;
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
    /// The search returns the first 5 ranked results by default, and whether there are more, as JSON.
    /// </summary>
    [Fact]
    public async Task Search_ReturnsFirst5ResultsAndHasMore()
    {
        _factory.PlaceProvider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Success(
            Enumerable.Range(1, 6).Select(i => new PlaceDetails($"N{i}", $"Pizza {i}", $"{i} rue de Caen", 49.18, -0.37)).ToList());

        HttpResponseMessage response = await _client.GetAsync("/api/places/search?query=pizza");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string json = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"results\":[{\"placeId\":\"N1\",\"name\":\"Pizza 1\",\"secondaryText\":\"1 rue de Caen\"}", json);
        Assert.Contains("\"hasMore\":true", json);
        SearchPage<PlaceSuggestion>? page = await response.Content.ReadFromJsonAsync<SearchPage<PlaceSuggestion>>();
        Assert.Equal(["N1", "N2", "N3", "N4", "N5"], page!.Results.Select(r => r.PlaceId));
    }

    /// <summary>
    /// The limit sets the number of results returned.
    /// </summary>
    [Fact]
    public async Task Search_WithLimit_ReturnsThatManyResults()
    {
        _factory.PlaceProvider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Success(
            Enumerable.Range(1, 6).Select(i => new PlaceDetails($"N{i}", $"Pizza {i}", "", 49.18, -0.37)).ToList());

        SearchPage<PlaceSuggestion>? page = await _client.GetFromJsonAsync<SearchPage<PlaceSuggestion>>("/api/places/search?query=pizza&limit=15");

        Assert.Equal(6, page!.Results.Count);
        Assert.False(page.HasMore);
    }

    /// <summary>
    /// A limit outside 1-50 is refused with a 400.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public async Task Search_LimitOutOfRange_Returns400(int limit)
    {
        HttpResponseMessage response = await _client.GetAsync($"/api/places/search?query=pizza&limit={limit}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
    public async Task Search_MoreThan30RequestsPerMinute_Returns429()
    {
        for (int i = 0; i < 30; i++)
        {
            HttpResponseMessage allowed = await _client.GetAsync("/api/places/search?query=ab");
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        HttpResponseMessage rejected = await _client.GetAsync("/api/places/search?query=ab");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }
}
