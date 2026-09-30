using api.Common;
using api.Services.Places;

namespace api.Services;

/// <summary>
/// Entry point for restaurant search. Delegates to the configured <see cref="IPlaceProvider"/>;
/// this is where a strategy like "search our database first" can be added later.
/// </summary>
public class PlaceSearchService(IPlaceProvider placeProvider, IConfiguration configuration) : IPlaceSearchService
{
    private const int MinInputLength = 3;
    private const int AutocompleteLimit = 8;
    private const int SearchLimit = 25;

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<PlaceSuggestion>>> AutocompleteAsync(string input, double? lat, double? lon, CancellationToken cancellationToken)
        => SearchWithLimitAsync(input, AutocompleteLimit, lat, lon, cancellationToken);

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<PlaceSuggestion>>> SearchAsync(string query, double? lat, double? lon, CancellationToken cancellationToken)
        => SearchWithLimitAsync(query, SearchLimit, lat, lon, cancellationToken);

    /// <summary>
    /// Validates the input, resolves the position (user's or the configured default city) and maps results to suggestions.
    /// </summary>
    private async Task<Result<IReadOnlyList<PlaceSuggestion>>> SearchWithLimitAsync(string query, int limit, double? lat, double? lon, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < MinInputLength)
            return Result<IReadOnlyList<PlaceSuggestion>>.Success([]);

        Result<IReadOnlyList<PlaceDetails>> result = await placeProvider.SearchAsync(trimmed, limit, ResolvePosition(lat, lon), cancellationToken);
        if (!result.IsSuccess)
            return Result<IReadOnlyList<PlaceSuggestion>>.Failure(result.Error!);

        List<PlaceSuggestion> suggestions = result.Value!
            .Select(p => new PlaceSuggestion(p.PlaceId, p.Name, p.Address))
            .ToList();
        return Result<IReadOnlyList<PlaceSuggestion>>.Success(suggestions);
    }

    /// <summary>
    /// Returns the user's position when provided, otherwise the default city from configuration (Places:DefaultLocation).
    /// </summary>
    private GeoPoint? ResolvePosition(double? lat, double? lon)
    {
        if (lat is not null && lon is not null)
            return new GeoPoint(lat.Value, lon.Value);

        double? defaultLat = configuration.GetValue<double?>("Places:DefaultLocation:Lat");
        double? defaultLon = configuration.GetValue<double?>("Places:DefaultLocation:Lon");
        return defaultLat is not null && defaultLon is not null ? new GeoPoint(defaultLat.Value, defaultLon.Value) : null;
    }
}
