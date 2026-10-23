using api.Common;
using api.Services.Places;
using api.Services.Places.Osm;
using Api.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Services.Places.Osm;

/// <summary>
/// Tests the mapping of Nominatim lookups, with a fake Nominatim server. Nominatim allows one request per second:
/// each test after the first waits up to a second.
/// </summary>
public class NominatimClientTests
{
    /// <summary>
    /// Creates a client whose Nominatim server answers <paramref name="nominatimJson"/>.
    /// </summary>
    private static NominatimClient Client(string nominatimJson)
        => new(FakeHttpMessageHandler.Client(nominatimJson), NullLogger<NominatimClient>.Instance);

    /// <summary>
    /// A place is mapped with its position, which Nominatim sends as strings.
    /// </summary>
    [Fact]
    public async Task LookupAsync_MapsThePlaceAndItsPosition()
    {
        NominatimClient client = Client("""
            [{"name": "Novità", "lat": "49.18", "lon": "-0.37", "address": {"road": "Rue Écuyère", "city": "Caen"}}]
            """);

        Result<PlaceDetails> result = await client.LookupAsync("N42", CancellationToken.None);

        Assert.Equal(new PlaceDetails("N42", "Novità", "Rue Écuyère, Caen", 49.18, -0.37), result.Value);
    }

    /// <summary>
    /// A place without position is dropped: it is not found.
    /// </summary>
    [Fact]
    public async Task LookupAsync_PlaceWithoutPosition_ReturnsNotFound()
    {
        NominatimClient client = Client("""[{"name": "Novità"}]""");

        Result<PlaceDetails> result = await client.LookupAsync("N42", CancellationToken.None);

        Assert.Equal(ErrorType.NotFound, result.Error?.Type);
    }
}
