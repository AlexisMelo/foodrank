using api.Common;
using api.Services.Places;

namespace api.Services;

/// <summary>
/// Searches real-world restaurants, independently of the underlying place provider.
/// </summary>
public interface IPlaceSearchService
{
    /// <summary>
    /// Returns the first <paramref name="limit"/> restaurants matching <paramref name="query"/>, favoring those near
    /// (<paramref name="lat"/>, <paramref name="lon"/>). Asking again with a bigger limit returns the same first results
    /// followed by the next ones ("Show more").
    /// </summary>
    /// <param name="query">Text typed by the user; shorter than 3 characters once trimmed, it returns no result.</param>
    /// <param name="limit">Maximum number of results, from 1 to <see cref="PlaceSearchService.MaxResults"/>.</param>
    /// <param name="lat">Latitude of the user in degrees; null when unknown (the default city is used).</param>
    /// <param name="lon">Longitude of the user in degrees; null when unknown (the default city is used).</param>
    /// <param name="cancellationToken">Cancels the provider request.</param>
    /// <returns>The results and whether there are more, or the provider failure.</returns>
    Task<Result<PlaceSearchPage>> SearchAsync(string query, int limit, double? lat, double? lon, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the area searches are centered on: the city at (<paramref name="lat"/>, <paramref name="lon"/>),
    /// or the configured default city when no position is given.
    /// </summary>
    Task<Result<SearchArea>> GetSearchAreaAsync(double? lat, double? lon, CancellationToken cancellationToken);
}
