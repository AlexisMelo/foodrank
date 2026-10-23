namespace api.Services.Places;

/// <summary>
/// Resolves the position place searches and restaurant suggestions are centered on: the user's when the client sent a
/// valid one, otherwise the default city of the configuration (Places:DefaultLocation), otherwise Paris.
/// </summary>
public static class SearchPosition
{
    /// <summary>
    /// Position used when neither the user's position nor Places:DefaultLocation is available (Paris).
    /// </summary>
    private static readonly GeoPoint FallbackLocation = new(48.8566, 2.3522);

    /// <summary>
    /// True when both coordinates are given and within valid ranges (latitude -90..90, longitude -180..180).
    /// </summary>
    /// <param name="lat">Latitude in degrees, null when not given.</param>
    /// <param name="lon">Longitude in degrees, null when not given.</param>
    /// <returns>True when (<paramref name="lat"/>, <paramref name="lon"/>) is a usable position.</returns>
    public static bool IsValid(double? lat, double? lon)
        => lat is >= -90 and <= 90 && lon is >= -180 and <= 180;

    /// <summary>
    /// Returns the user's position sent by the client, or null when it is missing, partial or out of range.
    /// </summary>
    /// <param name="lat">Latitude in degrees, from the query string.</param>
    /// <param name="lon">Longitude in degrees, from the query string.</param>
    /// <returns>The user's position, or null when it is not usable.</returns>
    public static GeoPoint? FromQuery(double? lat, double? lon)
        => IsValid(lat, lon) ? new GeoPoint(lat!.Value, lon!.Value) : null;

    /// <summary>
    /// Returns the default city from configuration (Places:DefaultLocation) when valid, otherwise Paris.
    /// </summary>
    /// <param name="configuration">Application settings holding Places:DefaultLocation.</param>
    /// <returns>The position used when the user's is unknown. Never null.</returns>
    public static GeoPoint Default(IConfiguration configuration)
    {
        double? defaultLat = configuration.GetValue<double?>("Places:DefaultLocation:Lat");
        double? defaultLon = configuration.GetValue<double?>("Places:DefaultLocation:Lon");
        return FromQuery(defaultLat, defaultLon) ?? FallbackLocation;
    }

    /// <summary>
    /// Returns the user's position when valid, otherwise <see cref="Default"/>.
    /// </summary>
    /// <param name="lat">Latitude in degrees, from the query string.</param>
    /// <param name="lon">Longitude in degrees, from the query string.</param>
    /// <param name="configuration">Application settings holding Places:DefaultLocation.</param>
    /// <returns>The position to center on. Never null.</returns>
    public static GeoPoint Resolve(double? lat, double? lon, IConfiguration configuration)
        => FromQuery(lat, lon) ?? Default(configuration);
}
