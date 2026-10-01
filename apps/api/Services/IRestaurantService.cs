using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Reads restaurants from the database and creates them from places selected in the search.
/// </summary>
public interface IRestaurantService
{
    /// <summary>
    /// Returns every restaurant stored in the database.
    /// </summary>
    Task<IReadOnlyList<Restaurant>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurant with the database identifier <paramref name="id"/>, or a NotFound error.
    /// </summary>
    Task<Result<Restaurant>> GetByIdAsync(string id, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the restaurant linked to <paramref name="placeId"/>, creating it from the place provider if it is not stored yet.
    /// </summary>
    Task<Result<Restaurant>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken);
}
