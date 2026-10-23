namespace api.Models;

/// <summary>
/// Body returned by POST /api/restaurants/from-place: the restaurant of the place selected in the search.
/// </summary>
/// <param name="Restaurant">The restaurant, stored in the database.</param>
/// <param name="Created">True when this request stored it (the user is the first to open the place); false when it
/// already existed, including when another request stored it at the same moment.</param>
public record RestaurantFromPlaceResponse(Restaurant Restaurant, bool Created);
