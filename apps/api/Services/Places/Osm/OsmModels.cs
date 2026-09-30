using System.Text.Json;

namespace api.Services.Places.Osm;

/// <summary>
/// JSON settings shared by the Photon and Nominatim clients.
/// </summary>
internal static class OsmJson
{
    /// <summary>
    /// Photon and Nominatim use snake_case (osm_type, house_number); Nominatim also sends lat/lon as strings.
    /// </summary>
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };
}

/// <summary>
/// Address formatting shared by the Photon and Nominatim clients.
/// </summary>
internal static class OsmAddress
{
    /// <summary>
    /// Builds a French-style address, e.g. "12 Rue Tupin, 69002 Lyon", skipping missing parts.
    /// </summary>
    public static string Format(string? houseNumber, string? street, string? postcode, string? city)
    {
        string streetPart = string.Join(' ', new[] { houseNumber, street }.Where(p => !string.IsNullOrWhiteSpace(p)));
        string cityPart = string.Join(' ', new[] { postcode, city }.Where(p => !string.IsNullOrWhiteSpace(p)));
        return string.Join(", ", new[] { streetPart, cityPart }.Where(p => p.Length > 0));
    }
}

// Response shapes of Photon (GeoJSON) and Nominatim (jsonv2). Only the fields we use are mapped.

/// <summary>
/// Photon search response (GeoJSON FeatureCollection).
/// </summary>
/// <param name="Features">One feature per place found.</param>
internal record PhotonResponse(List<PhotonFeature>? Features);

/// <summary>
/// A place found by Photon.
/// </summary>
/// <param name="Properties">OSM data of the place.</param>
/// <param name="Geometry">Position of the place.</param>
internal record PhotonFeature(PhotonProperties Properties, PhotonGeometry? Geometry);

/// <summary>
/// OSM data of a place found by Photon.
/// </summary>
/// <param name="OsmType">OSM element type: "N" (node), "W" (way) or "R" (relation).</param>
/// <param name="OsmId">OSM identifier, unique only within its <paramref name="OsmType"/>.</param>
/// <param name="Name">Name of the place; places without one are ignored.</param>
/// <param name="Housenumber">Street number.</param>
/// <param name="Street">Street name.</param>
/// <param name="Postcode">Postal code.</param>
/// <param name="City">City name.</param>
/// <param name="Type">Kind of object ("house", "street", "city", ...); "city" means the place is itself a locality.</param>
internal record PhotonProperties(
    string OsmType,
    long OsmId,
    string? Name,
    string? Housenumber,
    string? Street,
    string? Postcode,
    string? City,
    string? Type);

/// <summary>
/// GeoJSON point of a place found by Photon.
/// </summary>
/// <param name="Coordinates">Position as [lon, lat] (GeoJSON order, not lat/lon).</param>
internal record PhotonGeometry(List<double>? Coordinates);

/// <summary>
/// A place returned by Nominatim /lookup.
/// </summary>
/// <param name="Name">Name of the place.</param>
/// <param name="Lat">Latitude in degrees (sent as a string by Nominatim).</param>
/// <param name="Lon">Longitude in degrees (sent as a string by Nominatim).</param>
/// <param name="Address">Detailed address, returned with addressdetails=1.</param>
internal record NominatimPlace(string? Name, double? Lat, double? Lon, NominatimAddress? Address);

/// <summary>
/// Detailed address of a Nominatim place. Only one of <paramref name="City"/>, <paramref name="Town"/> or
/// <paramref name="Village"/> is usually set, depending on the size of the locality.
/// </summary>
/// <param name="HouseNumber">Street number.</param>
/// <param name="Road">Street name.</param>
/// <param name="Postcode">Postal code.</param>
/// <param name="City">Locality name for cities.</param>
/// <param name="Town">Locality name for towns.</param>
/// <param name="Village">Locality name for villages.</param>
internal record NominatimAddress(
    string? HouseNumber,
    string? Road,
    string? Postcode,
    string? City,
    string? Town,
    string? Village);
