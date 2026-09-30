using System.Globalization;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using api.Common;
using Microsoft.Extensions.Caching.Memory;

namespace api.Services.Places.Osm;

/// <summary>
/// <see cref="IPlaceProvider"/> backed by Photon (OpenStreetMap search, free, no API key).
/// </summary>
/// <remarks>
/// Photon has no "get by id" endpoint: every place returned by a search is cached, and <see cref="GetDetailsAsync"/>
/// reads that cache, falling back to Nominatim. Place ids are "{osm_type}{osm_id}", e.g. "N5287924742".
/// </remarks>
public partial class PhotonPlaceProvider(HttpClient httpClient, NominatimClient nominatimClient, IMemoryCache cache, ILogger<PhotonPlaceProvider> logger) : IPlaceProvider
{
    /// <summary>
    /// Language of the returned names and addresses.
    /// </summary>
    private const string Language = "fr";

    /// <summary>
    /// Size of the area favored around the user's position (map-like zoom level, higher = smaller area).
    /// Tuned with <see cref="LocationBiasScale"/> on Lyon/Paris: keeps results local while still finding exact names further away.
    /// </summary>
    private const int Zoom = 14;

    /// <summary>
    /// Weight of a place's global prominence against its distance (0 to 1, lower = distance matters more).
    /// 0 = proximity as strong as possible: with 0.2, "novita" near Caen ranked exact-spelling places in Japan and
    /// New York above the local "Novità". Exact names far away are still found (e.g. "paul bocuse" from Paris).
    /// </summary>
    private const string LocationBiasScale = "0.0";

    /// <summary>
    /// OSM tags (key:value) of the places returned by searches: restaurants, fast foods and cafés.
    /// </summary>
    private static readonly string[] OsmTags = ["amenity:restaurant", "amenity:fast_food", "amenity:cafe"];

    /// <summary>
    /// How long a search response is reused for identical queries, to limit calls to the public Photon instance.
    /// </summary>
    private static readonly TimeSpan SearchCacheDuration = TimeSpan.FromMinutes(10);

    /// <summary>
    /// How long each place found by a search stays available for <see cref="GetDetailsAsync"/> without calling Nominatim.
    /// </summary>
    private static readonly TimeSpan PlaceCacheDuration = TimeSpan.FromHours(1);

    /// <summary>
    /// How long the locality of a position is reused; a city name does not change, only the cache size is limited.
    /// </summary>
    private static readonly TimeSpan LocalityCacheDuration = TimeSpan.FromHours(6);

    /// <inheritdoc />
    public async Task<Result<IReadOnlyList<PlaceDetails>>> SearchAsync(string query, int limit, GeoPoint? near, CancellationToken cancellationToken)
    {
        string url = BuildSearchUrl(query, limit, near);
        if (cache.TryGetValue(url, out IReadOnlyList<PlaceDetails>? cached) && cached is not null)
            return Result<IReadOnlyList<PlaceDetails>>.Success(cached);

        using HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Photon search failed with {StatusCode}", (int)response.StatusCode);
            return Result<IReadOnlyList<PlaceDetails>>.Failure(new Error(ErrorType.Unavailable, "Place search is temporarily unavailable."));
        }

        PhotonResponse? payload = await response.Content.ReadFromJsonAsync<PhotonResponse>(OsmJson.Options, cancellationToken);
        List<PlaceDetails> places = (payload?.Features ?? [])
            .Where(f => !string.IsNullOrWhiteSpace(f.Properties.Name))
            .Select(ToDetails)
            .ToList();

        cache.Set(url, (IReadOnlyList<PlaceDetails>)places, SearchCacheDuration);
        foreach (PlaceDetails place in places)
            cache.Set(PlaceCacheKey(place.PlaceId), place, PlaceCacheDuration);

        return Result<IReadOnlyList<PlaceDetails>>.Success(places);
    }

    /// <inheritdoc />
    public async Task<Result<PlaceDetails>> GetDetailsAsync(string placeId, CancellationToken cancellationToken)
    {
        if (!OsmIdRegex().IsMatch(placeId))
            return Result<PlaceDetails>.Failure(new Error(ErrorType.NotFound, "Place not found."));

        if (cache.TryGetValue(PlaceCacheKey(placeId), out PlaceDetails? cached) && cached is not null)
            return Result<PlaceDetails>.Success(cached);

        Result<PlaceDetails> result = await nominatimClient.LookupAsync(placeId, cancellationToken);
        if (result.IsSuccess)
            cache.Set(PlaceCacheKey(placeId), result.Value!, PlaceCacheDuration);
        return result;
    }

    /// <inheritdoc />
    public async Task<Result<string?>> GetLocalityAsync(GeoPoint point, CancellationToken cancellationToken)
    {
        // Rounded to ~1 km: enough to know the city, and nearby users share cache entries.
        string lat = Math.Round(point.Lat, 2).ToString(CultureInfo.InvariantCulture);
        string lon = Math.Round(point.Lon, 2).ToString(CultureInfo.InvariantCulture);
        string url = $"reverse?lat={lat}&lon={lon}&lang={Language}&limit=1";
        if (cache.TryGetValue(url, out string? cached))
            return Result<string?>.Success(cached);

        using HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Photon reverse geocoding failed with {StatusCode}", (int)response.StatusCode);
            return Result<string?>.Failure(new Error(ErrorType.Unavailable, "Locality lookup is temporarily unavailable."));
        }

        PhotonResponse? payload = await response.Content.ReadFromJsonAsync<PhotonResponse>(OsmJson.Options, cancellationToken);
        PhotonProperties? nearest = payload?.Features?.FirstOrDefault()?.Properties;
        // "city" holds the locality of the nearest object; when the nearest object is the locality itself, it is its name.
        string? locality = nearest?.City ?? (nearest?.Type == "city" ? nearest.Name : null);

        cache.Set(url, locality, LocalityCacheDuration);
        return Result<string?>.Success(locality);
    }

    /// <summary>
    /// Builds the Photon search URL, restricted to food places and biased towards <paramref name="near"/>.
    /// </summary>
    private static string BuildSearchUrl(string query, int limit, GeoPoint? near)
    {
        string url = $"api?q={Uri.EscapeDataString(query.ToLowerInvariant())}&limit={limit}&lang={Language}";
        foreach (string tag in OsmTags)
            url += $"&osm_tag={tag}";
        if (near is not null)
        {
            // Rounded to ~100 m so nearby users share cache entries.
            string lat = Math.Round(near.Lat, 3).ToString(CultureInfo.InvariantCulture);
            string lon = Math.Round(near.Lon, 3).ToString(CultureInfo.InvariantCulture);
            url += $"&lat={lat}&lon={lon}&zoom={Zoom}&location_bias_scale={LocationBiasScale}";
        }
        return url;
    }

    /// <summary>
    /// Maps a Photon GeoJSON feature to provider-agnostic details.
    /// </summary>
    private static PlaceDetails ToDetails(PhotonFeature feature)
    {
        PhotonProperties p = feature.Properties;
        List<double>? coordinates = feature.Geometry?.Coordinates;
        bool hasCoordinates = coordinates is { Count: 2 };
        return new PlaceDetails(
            $"{p.OsmType}{p.OsmId}",
            p.Name!,
            OsmAddress.Format(p.Housenumber, p.Street, p.Postcode, p.City),
            hasCoordinates ? coordinates![1] : null,
            hasCoordinates ? coordinates![0] : null);
    }

    /// <summary>
    /// Cache key of a single place.
    /// </summary>
    private static string PlaceCacheKey(string placeId) => $"osm-place:{placeId}";

    [GeneratedRegex("^[NWR][0-9]+$")]
    private static partial Regex OsmIdRegex();
}
