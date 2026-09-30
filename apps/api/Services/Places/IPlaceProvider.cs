using api.Common;

namespace api.Services.Places;

/// <summary>
/// Contract for an external place data source (Photon, Google, ...). Swap the implementation in Program.cs to change provider.
/// </summary>
public interface IPlaceProvider
{
    /// <summary>
    /// Searches restaurants matching <paramref name="query"/>, favoring those close to <paramref name="near"/> when given.
    /// </summary>
    Task<Result<IReadOnlyList<PlaceDetails>>> SearchAsync(string query, int limit, GeoPoint? near, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches a single place from its provider identifier.
    /// </summary>
    Task<Result<PlaceDetails>> GetDetailsAsync(string placeId, CancellationToken cancellationToken);
}
