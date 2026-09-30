using System.Globalization;
using System.Text;

namespace api.Services.Places;

/// <summary>
/// Orders search results independently of the provider's own ranking, which can favor an exact spelling
/// far away over a nearby place (e.g. "novita" ranking Japan and New York above "Novità" in Caen).
/// </summary>
public static class PlaceRanking
{
    /// <summary>
    /// Mean Earth radius in kilometers, used by the haversine distance.
    /// </summary>
    private const double EarthRadiusKm = 6371;

    /// <summary>
    /// Orders places in two groups, each sorted from nearest to farthest from <paramref name="origin"/>:
    /// first those whose name contains every word of <paramref name="query"/> (ignoring case and accents),
    /// then the approximate matches. Places without coordinates come last in their group.
    /// </summary>
    public static IEnumerable<PlaceDetails> Rank(IEnumerable<PlaceDetails> places, string query, GeoPoint origin)
    {
        string[] words = Normalize(query).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return places
            .OrderByDescending(p => ContainsAllWords(p.Name, words))
            .ThenBy(p => p.Lat is null || p.Lng is null ? double.MaxValue : DistanceKm(origin, p.Lat.Value, p.Lng.Value));
    }

    /// <summary>
    /// True when the normalized <paramref name="name"/> contains each of the (already normalized) <paramref name="words"/>.
    /// </summary>
    private static bool ContainsAllWords(string name, string[] words)
    {
        string normalizedName = Normalize(name);
        return words.All(normalizedName.Contains);
    }

    /// <summary>
    /// Lowercases, removes accents ("Novità" becomes "novita") and replaces punctuation with spaces.
    /// </summary>
    private static string Normalize(string text)
    {
        StringBuilder builder = new(text.Length);
        foreach (char c in text.ToLowerInvariant().Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(char.IsLetterOrDigit(c) ? c : ' ');
        }
        return builder.ToString();
    }

    /// <summary>
    /// Great-circle distance in kilometers between <paramref name="origin"/> and a point (haversine formula).
    /// </summary>
    private static double DistanceKm(GeoPoint origin, double lat, double lon)
    {
        double dLat = ToRadians(lat - origin.Lat);
        double dLon = ToRadians(lon - origin.Lon);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(ToRadians(origin.Lat)) * Math.Cos(ToRadians(lat)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * EarthRadiusKm * Math.Asin(Math.Sqrt(a));
    }

    /// <summary>
    /// Converts degrees to radians.
    /// </summary>
    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
