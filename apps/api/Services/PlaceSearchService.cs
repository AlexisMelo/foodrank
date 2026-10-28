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
    /// Maximum number of results of a search, which is also the number of candidates fetched from the provider for
    /// every search whatever the limit asked: ranking the same candidates keeps the first results in place when more
    /// are asked, and lets a nearby place the provider ranked low make it into the first ones after
    /// <see cref="PlaceRanking.Rank"/>.
    /// </summary>
    public const int MaxResults = 50;

    /// <inheritdoc />
    public async Task<Result<PlaceSearchPage>> SearchAsync(string query, int limit, double? lat, double? lon, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < MinInputLength)
            return Result<PlaceSearchPage>.Success(new PlaceSearchPage([], false));

        GeoPoint position = SearchPosition.Resolve(lat, lon, configuration);
        Result<IReadOnlyList<PlaceDetails>> result = await placeProvider.SearchAsync(trimmed, MaxResults, position, cancellationToken);
        if (!result.IsSuccess)
            return Result<PlaceSearchPage>.Failure(result.Error!);

        List<PlaceSuggestion> ranked = PlaceRanking.Rank(result.Value!, trimmed, position)
            .Select(p => new PlaceSuggestion(p.PlaceId, p.Name, p.Address))
            .ToList();
        return Result<PlaceSearchPage>.Success(new PlaceSearchPage(ranked.Take(limit).ToList(), ranked.Count > limit));
    }

    /// <inheritdoc />
    public async Task<Result<SearchArea>> GetSearchAreaAsync(double? lat, double? lon, CancellationToken cancellationToken)
    {
        bool isDefault = !SearchPosition.IsValid(lat, lon);
        Result<string?> locality = await placeProvider.GetLocalityAsync(SearchPosition.Resolve(lat, lon, configuration), cancellationToken);
        return locality.IsSuccess
            ? Result<SearchArea>.Success(new SearchArea(locality.Value, isDefault))
            : Result<SearchArea>.Failure(locality.Error!);
    }
}
