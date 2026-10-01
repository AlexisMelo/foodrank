using api.Common;
using api.Services.Places;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IPlaceProvider"/>: returns configured results and records the calls it receives.
/// </summary>
public class FakePlaceProvider : IPlaceProvider
{
    /// <summary>
    /// Result returned by <see cref="SearchAsync"/>.
    /// </summary>
    public Result<IReadOnlyList<PlaceDetails>> SearchResult { get; set; } = Result<IReadOnlyList<PlaceDetails>>.Success([]);

    /// <summary>
    /// Result returned by <see cref="GetDetailsAsync"/>.
    /// </summary>
    public Result<PlaceDetails> DetailsResult { get; set; } = Result<PlaceDetails>.Failure(new Error(ErrorType.NotFound, "Place not found."));

    /// <summary>
    /// Result returned by <see cref="GetLocalityAsync"/>.
    /// </summary>
    public Result<string?> LocalityResult { get; set; } = Result<string?>.Success(null);

    /// <summary>
    /// Number of calls to <see cref="SearchAsync"/>.
    /// </summary>
    public int SearchCalls { get; private set; }

    /// <summary>
    /// Query received by the last call to <see cref="SearchAsync"/>.
    /// </summary>
    public string? LastQuery { get; private set; }

    /// <summary>
    /// Limit received by the last call to <see cref="SearchAsync"/>.
    /// </summary>
    public int? LastLimit { get; private set; }

    /// <summary>
    /// Position received by the last call to <see cref="SearchAsync"/> or <see cref="GetLocalityAsync"/>.
    /// </summary>
    public GeoPoint? LastPosition { get; private set; }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<PlaceDetails>>> SearchAsync(string query, int limit, GeoPoint? near, CancellationToken cancellationToken)
    {
        SearchCalls++;
        LastQuery = query;
        LastLimit = limit;
        LastPosition = near;
        return Task.FromResult(SearchResult);
    }

    /// <inheritdoc />
    public Task<Result<PlaceDetails>> GetDetailsAsync(string placeId, CancellationToken cancellationToken)
        => Task.FromResult(DetailsResult);

    /// <inheritdoc />
    public Task<Result<string?>> GetLocalityAsync(GeoPoint point, CancellationToken cancellationToken)
    {
        LastPosition = point;
        return Task.FromResult(LocalityResult);
    }
}
