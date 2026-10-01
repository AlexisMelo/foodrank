using api.Common;
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
    /// Inputs shorter than 3 characters (once trimmed) return no result without calling the provider.
    /// </summary>
    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("  ab  ")]
    public async Task AutocompleteAsync_TooShortInput_ReturnsEmptyWithoutCallingProvider(string input)
    {
        Result<IReadOnlyList<PlaceSuggestion>> result = await CreateService().AutocompleteAsync(input, null, null, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!);
        Assert.Equal(0, _provider.SearchCalls);
    }

    /// <summary>
    /// The input is trimmed and twice the displayed count is requested, so nearby places ranked low can still appear.
    /// </summary>
    [Fact]
    public async Task AutocompleteAsync_TrimsInputAndFetchesExtraCandidates()
    {
        await CreateService().AutocompleteAsync("  pizza ", 49.18, -0.37, CancellationToken.None);

        Assert.Equal("pizza", _provider.LastQuery);
        Assert.Equal(16, _provider.LastLimit);
    }

    /// <summary>
    /// Autocomplete keeps at most 8 suggestions, mapping the address to the secondary text.
    /// </summary>
    [Fact]
    public async Task AutocompleteAsync_KeepsAtMost8Suggestions()
    {
        _provider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Success(
            Enumerable.Range(0, 16).Select(i => new PlaceDetails($"N{i}", $"Pizza {i}", $"{i} rue de Caen", 49.18, -0.37)).ToList());

        Result<IReadOnlyList<PlaceSuggestion>> result = await CreateService().AutocompleteAsync("pizza", null, null, CancellationToken.None);

        Assert.Equal(8, result.Value!.Count);
        Assert.Equal("0 rue de Caen", result.Value[0].SecondaryText);
    }

    /// <summary>
    /// A valid user position is sent to the provider as is.
    /// </summary>
    [Fact]
    public async Task SearchAsync_ValidPosition_UsesUserPosition()
    {
        await CreateService().SearchAsync("pizza", 49.18, -0.37, CancellationToken.None);

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

        await service.SearchAsync("pizza", lat, lon, CancellationToken.None);

        Assert.Equal(new GeoPoint(49.1829, -0.3707), _provider.LastPosition);
    }

    /// <summary>
    /// Without a position nor a configured default, Paris is used.
    /// </summary>
    [Fact]
    public async Task SearchAsync_NoPositionNorDefault_FallsBackToParis()
    {
        await CreateService().SearchAsync("pizza", null, null, CancellationToken.None);

        Assert.Equal(new GeoPoint(48.8566, 2.3522), _provider.LastPosition);
    }

    /// <summary>
    /// A provider failure is returned as is.
    /// </summary>
    [Fact]
    public async Task SearchAsync_ProviderFails_ReturnsFailure()
    {
        _provider.SearchResult = Result<IReadOnlyList<PlaceDetails>>.Failure(new Error(ErrorType.Unavailable, "down"));

        Result<IReadOnlyList<PlaceSuggestion>> result = await CreateService().SearchAsync("pizza", null, null, CancellationToken.None);

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
