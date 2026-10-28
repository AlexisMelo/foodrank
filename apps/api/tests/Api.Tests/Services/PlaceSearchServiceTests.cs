using api.Common;
using api.Models;
using api.Services;
using api.Services.Places;
using Api.Tests.Fakes;
using Microsoft.Extensions.Configuration;

namespace Api.Tests.Services;

/// <summary>
/// Tests input validation, position resolution and ranking done by <see cref="PlaceSearchService"/>.
/// </summary>
public class PlaceSearchServiceTests
{
    /// <summary>
    /// Provider called by the service under test.
    /// </summary>
    private readonly FakePlaceProvider _provider = new();

    /// <summary>
    /// Builds the service with the given configuration values (none by default).
    /// </summary>
    private PlaceSearchService CreateService(Dictionary<string, string?>? settings = null)
    {
        IConfiguration configuration = new ConfigurationBuilder().AddInMemoryCollection(settings ?? []).Build();
        return new PlaceSearchService(_provider, configuration);
    }

    /// <summary>
    /// Makes the provider return <paramref name="count"/> places named "Pizza 0", "Pizza 1"... all at the same position,
    /// so their ranking keeps this order.
    /// </summary>
    private void ProviderFinds(int count)
        => _provider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Success(
            Enumerable.Range(0, count).Select(i => new PlaceDetails($"N{i}", $"Pizza {i}", $"{i} rue de Caen", 49.18, -0.37)).ToList());

    /// <summary>
    /// Queries shorter than 3 characters (once trimmed) return no result without calling the provider.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("  ab  ")]
    public async Task SearchAsync_TooShortQuery_ReturnsEmptyWithoutCallingProvider(string query)
    {
        Result<SearchPage<PlaceSuggestion>> result = await CreateService().SearchAsync(query, 5, null, null, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Results);
        Assert.False(result.Value.HasMore);
        Assert.Equal(0, _provider.SearchCalls);
    }

    /// <summary>
    /// The query is trimmed, and the same 50 candidates are requested whatever the limit, so that asking for more
    /// results keeps the first ones in place (and the provider answer can be reused).
    /// </summary>
    [Theory]
    [InlineData(5)]
    [InlineData(15)]
    public async Task SearchAsync_TrimsQueryAndAlwaysFetches50Candidates(int limit)
    {
        await CreateService().SearchAsync("  pizza ", limit, 49.18, -0.37, CancellationToken.None);

        Assert.Equal("pizza", _provider.LastQuery);
        Assert.Equal(50, _provider.LastLimit);
    }

    /// <summary>
    /// The search keeps the first <c>limit</c> results, mapping the address to the secondary text, and tells there are more.
    /// </summary>
    [Fact]
    public async Task SearchAsync_MoreResultsThanLimit_ReturnsFirstOnesAndHasMore()
    {
        ProviderFinds(16);

        Result<SearchPage<PlaceSuggestion>> result = await CreateService().SearchAsync("pizza", 5, null, null, CancellationToken.None);

        Assert.Equal(["N0", "N1", "N2", "N3", "N4"], result.Value!.Results.Select(r => r.PlaceId));
        Assert.Equal("0 rue de Caen", result.Value.Results[0].SecondaryText);
        Assert.True(result.Value.HasMore);
    }

    /// <summary>
    /// A bigger limit returns the same first results followed by the next ones ("Show more").
    /// </summary>
    [Fact]
    public async Task SearchAsync_BiggerLimit_KeepsTheFirstResultsInPlace()
    {
        ProviderFinds(16);
        PlaceSearchService service = CreateService();

        Result<SearchPage<PlaceSuggestion>> first = await service.SearchAsync("pizza", 5, null, null, CancellationToken.None);
        Result<SearchPage<PlaceSuggestion>> more = await service.SearchAsync("pizza", 15, null, null, CancellationToken.None);

        Assert.Equal(first.Value!.Results, more.Value!.Results.Take(5));
        Assert.Equal(15, more.Value.Results.Count);
    }

    /// <summary>
    /// When the limit reaches the number of results, they are all returned and there are no more.
    /// </summary>
    [Theory]
    [InlineData(16)]
    [InlineData(25)]
    public async Task SearchAsync_LimitReachesTheEnd_HasNoMore(int limit)
    {
        ProviderFinds(16);

        Result<SearchPage<PlaceSuggestion>> result = await CreateService().SearchAsync("pizza", limit, null, null, CancellationToken.None);

        Assert.Equal(16, result.Value!.Results.Count);
        Assert.False(result.Value.HasMore);
    }

    /// <summary>
    /// A valid user position is sent to the provider as is.
    /// </summary>
    [Fact]
    public async Task SearchAsync_ValidPosition_UsesUserPosition()
    {
        await CreateService().SearchAsync("pizza", 5, 49.18, -0.37, CancellationToken.None);

        Assert.Equal(new GeoPoint(49.18, -0.37), _provider.LastPosition);
    }

    /// <summary>
    /// Without a valid position, the configured default location is used.
    /// </summary>
    [Theory]
    [InlineData(null, null)]
    [InlineData(91.0, 0.0)]
    [InlineData(0.0, 181.0)]
    public async Task SearchAsync_InvalidPosition_UsesConfiguredDefault(double? lat, double? lon)
    {
        PlaceSearchService service = CreateService(new Dictionary<string, string?>
        {
            ["Places:DefaultLocation:Lat"] = "49.1829",
            ["Places:DefaultLocation:Lon"] = "-0.3707"
        });

        await service.SearchAsync("pizza", 5, lat, lon, CancellationToken.None);

        Assert.Equal(new GeoPoint(49.1829, -0.3707), _provider.LastPosition);
    }

    /// <summary>
    /// Without a position nor a configured default, Paris is used.
    /// </summary>
    [Fact]
    public async Task SearchAsync_NoPositionNorDefault_FallsBackToParis()
    {
        await CreateService().SearchAsync("pizza", 5, null, null, CancellationToken.None);

        Assert.Equal(new GeoPoint(48.8566, 2.3522), _provider.LastPosition);
    }

    /// <summary>
    /// A provider failure is returned as is.
    /// </summary>
    [Fact]
    public async Task SearchAsync_ProviderFails_ReturnsFailure()
    {
        _provider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Failure(new Error(ErrorType.Unavailable, "down"));

        Result<SearchPage<PlaceSuggestion>> result = await CreateService().SearchAsync("pizza", 5, null, null, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Unavailable, result.Error!.Type);
    }

    /// <summary>
    /// The search area is flagged as default when no position is given.
    /// </summary>
    [Fact]
    public async Task GetSearchAreaAsync_NoPosition_IsDefault()
    {
        _provider.LocalityResult = Result<string?>.Success("Paris");

        Result<SearchArea> result = await CreateService().GetSearchAreaAsync(null, null, CancellationToken.None);

        Assert.Equal(new SearchArea("Paris", true), result.Value);
    }

    /// <summary>
    /// The search area is not flagged as default when the user's position is given.
    /// </summary>
    [Fact]
    public async Task GetSearchAreaAsync_WithPosition_IsNotDefault()
    {
        _provider.LocalityResult = Result<string?>.Success("Caen");

        Result<SearchArea> result = await CreateService().GetSearchAreaAsync(49.18, -0.37, CancellationToken.None);

        Assert.Equal(new SearchArea("Caen", false), result.Value);
    }
}
