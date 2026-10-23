using api.Common;
using api.Services.Places;
using api.Services.Places.Osm;
using Api.Tests.Fakes;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests.Services.Places.Osm;

/// <summary>
/// Tests the mapping of Photon search results, with a fake Photon server.
/// </summary>
public class PhotonPlaceProviderTests
{
    /// <summary>
    /// Creates a provider whose Photon server answers <paramref name="photonJson"/>; Nominatim finds nothing.
    /// </summary>
    private static PhotonPlaceProvider Provider(string photonJson) => new(
        FakeHttpMessageHandler.Client(photonJson),
        new NominatimClient(FakeHttpMessageHandler.Client("[]"), NullLogger<NominatimClient>.Instance),
        new MemoryCache(new MemoryCacheOptions()),
        NullLogger<PhotonPlaceProvider>.Instance);

    /// <summary>
    /// A place is mapped with its id, name, address and position (GeoJSON sends [lon, lat]).
    /// </summary>
    [Fact]
    public async Task SearchAsync_MapsPlaces()
    {
        PhotonPlaceProvider provider = Provider("""
            {"features": [{
                "properties": {"osm_type": "N", "osm_id": 42, "name": "Novità", "housenumber": "1", "street": "Rue Écuyère", "postcode": "14000", "city": "Caen"},
                "geometry": {"coordinates": [-0.37, 49.18]}
            }]}
            """);

        Result<IReadOnlyList<PlaceDetails>> result = await provider.SearchAsync("novita", 10, null, CancellationToken.None);

        Assert.Equal(new PlaceDetails("N42", "Novità", "1 Rue Écuyère, 14000 Caen", 49.18, -0.37), Assert.Single(result.Value!));
    }

    /// <summary>
    /// The places without name or position are dropped, and cannot be opened afterwards.
    /// </summary>
    [Fact]
    public async Task SearchAsync_DropsPlacesWithoutNameOrPosition()
    {
        PhotonPlaceProvider provider = Provider("""
            {"features": [
                {"properties": {"osm_type": "N", "osm_id": 1, "name": "Kept"}, "geometry": {"coordinates": [-0.37, 49.18]}},
                {"properties": {"osm_type": "N", "osm_id": 2, "name": "No geometry"}},
                {"properties": {"osm_type": "N", "osm_id": 3, "name": "No coordinates"}, "geometry": {}},
                {"properties": {"osm_type": "N", "osm_id": 4, "name": "Partial coordinates"}, "geometry": {"coordinates": [-0.37]}},
                {"properties": {"osm_type": "N", "osm_id": 5}, "geometry": {"coordinates": [-0.37, 49.18]}}
            ]}
            """);

        Result<IReadOnlyList<PlaceDetails>> result = await provider.SearchAsync("pizza", 10, null, CancellationToken.None);

        Assert.Equal(["N1"], result.Value!.Select(p => p.PlaceId));
        Assert.False((await provider.GetDetailsAsync("N2", CancellationToken.None)).IsSuccess);
    }
}
