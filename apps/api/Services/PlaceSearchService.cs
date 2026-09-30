using api.Common;
using api.Services.Places;

namespace api.Services;

/// <summary>
/// Entry point for restaurant search. Delegates to the configured <see cref="IPlaceProvider"/>;
/// this is where a strategy like "search our database first" can be added later.
/// </summary>
public class PlaceSearchService(IPlaceProvider placeProvider, IConfiguration configuration) : IPlaceSearchService
{
    /// <summary>
    /// Minimum number of characters before querying the provider; shorter inputs return an empty list.
    /// </summary>
    private const int MinInputLength = 3;

    /// <summary>
    /// Maximum number of suggestions returned while the user is typing.
    /// </summary>
    private const int AutocompleteLimit = 8;

    /// <summary>
    /// Maximum number of results returned by the longer search of the results page ("Load more").
    /// </summary>
    private const int SearchLimit = 25;

    /// <summary>
    /// How many more candidates than displayed are fetched from the provider, so that a nearby place the provider
    /// ranked low can still make it into the list after <see cref="PlaceRanking.Rank"/>.
    /// </summary>
    private const int CandidatesFactor = 2;

    /// <summary>
    /// Position used when neither the user's position nor Places:DefaultLocation is available (Paris).
    /// </summary>
    private static readonly GeoPoint FallbackLocation = new(48.8566, 2.3522);

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<PlaceSuggestion>>> AutocompleteAsync(string input, double? lat, double? lon, CancellationToken cancellationToken)
        => SearchWithLimitAsync(input, AutocompleteLimit, lat, lon, cancellationToken);

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<PlaceSuggestion>>> SearchAsync(string query, double? lat, double? lon, CancellationToken cancellationToken)
        => SearchWithLimitAsync(query, SearchLimit, lat, lon, cancellationToken);

    /// <inheritdoc />
    public async Task<Result<SearchArea>> GetSearchAreaAsync(double? lat, double? lon, CancellationToken cancellationToken)
    {
        bool isDefault = !IsValidPosition(lat, lon);
        Result<string?> locality = await placeProvider.GetLocalityAsync(ResolvePosition(lat, lon), cancellationToken);
        return locality.IsSuccess
            ? Result<SearchArea>.Success(new SearchArea(locality.Value, isDefault))
            : Result<SearchArea>.Failure(locality.Error!);
    }

    /// <summary>
    /// Validates the input, resolves the position (user's or the configured default city), fetches extra candidates,
    /// re-ranks them by match then distance, and keeps the first <paramref name="limit"/> as suggestions.
    /// </summary>
    private async Task<Result<IReadOnlyList<PlaceSuggestion>>> SearchWithLimitAsync(string query, int limit, double? lat, double? lon, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < MinInputLength)
            return Result<IReadOnlyList<PlaceSuggestion>>.Success([]);

        GeoPoint position = ResolvePosition(lat, lon);
        Result<IReadOnlyList<PlaceDetails>> result = await placeProvider.SearchAsync(trimmed, limit * CandidatesFactor, position, cancellationToken);
        if (!result.IsSuccess)
            return Result<IReadOnlyList<PlaceSuggestion>>.Failure(result.Error!);

        List<PlaceSuggestion> suggestions = PlaceRanking.Rank(result.Value!, trimmed, position)
            .Take(limit)
            .Select(p => new PlaceSuggestion(p.PlaceId, p.Name, p.Address))
            .ToList();
        return Result<IReadOnlyList<PlaceSuggestion>>.Success(suggestions);
    }

    /// <summary>
    /// Returns the user's position when valid, otherwise the default city from configuration (Places:DefaultLocation),
    /// otherwise <see cref="FallbackLocation"/>. Never null.
    /// </summary>
    private GeoPoint ResolvePosition(double? lat, double? lon)
    {
        if (IsValidPosition(lat, lon))
            return new GeoPoint(lat!.Value, lon!.Value);

        double? defaultLat = configuration.GetValue<double?>("Places:DefaultLocation:Lat");
        double? defaultLon = configuration.GetValue<double?>("Places:DefaultLocation:Lon");
        return IsValidPosition(defaultLat, defaultLon)
            ? new GeoPoint(defaultLat!.Value, defaultLon!.Value)
            : FallbackLocation;
    }

    /// <summary>
    /// True when both coordinates are given and within valid ranges (latitude -90..90, longitude -180..180).
    /// </summary>
    private static bool IsValidPosition(double? lat, double? lon)
        => lat is >= -90 and <= 90 && lon is >= -180 and <= 180;
}
