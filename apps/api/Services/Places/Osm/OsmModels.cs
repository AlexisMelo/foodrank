using System.Text.Json;

namespace api.Services.Places.Osm;

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

internal record PhotonResponse(List<PhotonFeature>? Features);

internal record PhotonFeature(PhotonProperties Properties, PhotonGeometry? Geometry);

internal record PhotonProperties(
    string OsmType,
    long OsmId,
    string? Name,
    string? Housenumber,
    string? Street,
    string? Postcode,
    string? City);

/// <summary>GeoJSON point: coordinates are [lon, lat].</summary>
internal record PhotonGeometry(List<double>? Coordinates);

internal record NominatimPlace(string? Name, double? Lat, double? Lon, NominatimAddress? Address);

internal record NominatimAddress(
    string? HouseNumber,
    string? Road,
    string? Postcode,
    string? City,
    string? Town,
    string? Village);
