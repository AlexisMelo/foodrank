namespace api.Services.Places;

/// <summary>
/// A geographic position, used to favor nearby results.
/// </summary>
/// <param name="Lat">Latitude in degrees.</param>
/// <param name="Lon">Longitude in degrees.</param>
public record GeoPoint(double Lat, double Lon);

/// <summary>
/// Full information about a place, independent of the place provider.
/// </summary>
/// <param name="PlaceId">Provider identifier of the place (e.g. "N5287924742" for OSM).</param>
/// <param name="Name">Name of the place.</param>
/// <param name="Address">Postal address, empty when unknown.</param>
/// <param name="Lat">Latitude in degrees, when known.</param>
/// <param name="Lng">Longitude in degrees, when known.</param>
public record PlaceDetails(string PlaceId, string Name, string Address, double? Lat, double? Lng);

/// <summary>
/// A search result as shown to the user, independent of the place provider.
/// </summary>
/// <param name="PlaceId">Provider identifier of the place, sent back when the user selects it.</param>
/// <param name="Name">Name of the place.</param>
/// <param name="SecondaryText">Additional line displayed under the name (the address).</param>
public record PlaceSuggestion(string PlaceId, string Name, string SecondaryText);
