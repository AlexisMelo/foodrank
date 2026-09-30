namespace api.Services.Places;

/// <summary>
/// A geographic position, used to favor nearby results.
/// </summary>
public record GeoPoint(double Lat, double Lon);

/// <summary>
/// Full information about a place, independent of the place provider.
/// </summary>
public record PlaceDetails(string PlaceId, string Name, string Address, double? Lat, double? Lng);

/// <summary>
/// A search result as shown to the user, independent of the place provider.
/// </summary>
public record PlaceSuggestion(string PlaceId, string Name, string SecondaryText);
