namespace api.Models;

/// <summary>
/// Body of POST /api/restaurants/from-place.
/// </summary>
/// <param name="PlaceId">Provider identifier of the place selected in the search.</param>
public record CreateRestaurantFromPlaceRequest(string PlaceId);
