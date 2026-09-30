using System.Net.Http.Json;
using api.Common;

namespace api.Services.Places.Osm;

/// <summary>
/// Looks up OSM places by identifier on Nominatim. Used only as a fallback when a place is no longer in cache.
/// </summary>
/// <remarks>
/// Usage policy (https://operations.osmfoundation.org/policies/nominatim/): max 1 request/second,
/// identifying User-Agent, results cached on our side, no autocomplete.
/// </remarks>
public class NominatimClient(HttpClient httpClient, ILogger<NominatimClient> logger)
{
    private static readonly TimeSpan MinDelayBetweenRequests = TimeSpan.FromSeconds(1);
    private static readonly SemaphoreSlim Throttle = new(1, 1);
    private static DateTime _lastRequestUtc = DateTime.MinValue;

    /// <summary>
    /// Fetches a place from its OSM identifier ("N123", "W456" or "R789").
    /// </summary>
    public async Task<Result<PlaceDetails>> LookupAsync(string osmId, CancellationToken cancellationToken)
    {
        string url = $"lookup?osm_ids={Uri.EscapeDataString(osmId)}&format=jsonv2&addressdetails=1&accept-language=fr";

        await Throttle.WaitAsync(cancellationToken);
        HttpResponseMessage response;
        try
        {
            TimeSpan wait = _lastRequestUtc + MinDelayBetweenRequests - DateTime.UtcNow;
            if (wait > TimeSpan.Zero)
                await Task.Delay(wait, cancellationToken);

            response = await httpClient.GetAsync(url, cancellationToken);
            _lastRequestUtc = DateTime.UtcNow;
        }
        finally
        {
            Throttle.Release();
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Nominatim lookup of {OsmId} failed with {StatusCode}", osmId, (int)response.StatusCode);
                return Result<PlaceDetails>.Failure(new Error(ErrorType.Unavailable, "Place lookup is temporarily unavailable."));
            }

            List<NominatimPlace>? places = await response.Content.ReadFromJsonAsync<List<NominatimPlace>>(OsmJson.Options, cancellationToken);
            NominatimPlace? place = places?.FirstOrDefault();
            if (place is null || string.IsNullOrWhiteSpace(place.Name))
                return Result<PlaceDetails>.Failure(new Error(ErrorType.NotFound, "Place not found."));

            return Result<PlaceDetails>.Success(ToDetails(osmId, place));
        }
    }

    /// <summary>
    /// Maps a Nominatim place to provider-agnostic details.
    /// </summary>
    private static PlaceDetails ToDetails(string osmId, NominatimPlace place)
    {
        NominatimAddress? address = place.Address;
        string? city = address?.City ?? address?.Town ?? address?.Village;
        return new PlaceDetails(
            osmId,
            place.Name!,
            OsmAddress.Format(address?.HouseNumber, address?.Road, address?.Postcode, city),
            place.Lat,
            place.Lon);
    }
}
