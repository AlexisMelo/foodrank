using api.Common;
using api.Services.Places;

namespace api.Services;

/// <summary>
/// Searches real-world restaurants, independently of the underlying place provider.
/// </summary>
public interface IPlaceSearchService
{
    /// <summary>
    /// Returns a few restaurant suggestions while the user is typing, favoring those near (<paramref name="lat"/>, <paramref name="lon"/>).
    /// </summary>
    Task<Result<IReadOnlyList<PlaceSuggestion>>> AutocompleteAsync(string input, double? lat, double? lon, CancellationToken cancellationToken);

    /// <summary>
    /// Returns a longer list of restaurants for the search results page ("Load more").
    /// </summary>
    Task<Result<IReadOnlyList<PlaceSuggestion>>> SearchAsync(string query, double? lat, double? lon, CancellationToken cancellationToken);
}
