using api.Services.Places;

namespace Api.Tests.Services.Places;

/// <summary>
/// Tests the ordering of search results by match quality then distance.
/// </summary>
public class PlaceRankingTests
{
    /// <summary>
    /// Search origin used by the tests: Caen.
    /// </summary>
    private static readonly GeoPoint Caen = new(49.1829, -0.3707);

    /// <summary>
    /// A place whose name contains every word of the query comes before an approximate match, even if farther away.
    /// </summary>
    [Fact]
    public void Rank_PutsExactMatchesBeforeApproximateOnes()
    {
        PlaceDetails approximateNearby = new("1", "Pizzeria du Port", "", 49.18, -0.37);
        PlaceDetails exactFarAway = new("2", "Novita", "", 40.71, -74.00);

        List<PlaceDetails> ranked = PlaceRanking.Rank([approximateNearby, exactFarAway], "novita", Caen).ToList();

        Assert.Equal(["2", "1"], ranked.Select(p => p.PlaceId));
    }

    /// <summary>
    /// Matching ignores case, accents and punctuation ("Novità" matches "novita").
    /// </summary>
    [Fact]
    public void Rank_IgnoresCaseAccentsAndPunctuation()
    {
        PlaceDetails other = new("1", "Le Bistrot", "", 49.18, -0.37);
        PlaceDetails accented = new("2", "Trattoria NOVITÀ!", "", 48.85, 2.35);

        List<PlaceDetails> ranked = PlaceRanking.Rank([other, accented], "Novita", Caen).ToList();

        Assert.Equal("2", ranked[0].PlaceId);
    }

    /// <summary>
    /// Within the same match group, the nearest place comes first.
    /// </summary>
    [Fact]
    public void Rank_OrdersByDistanceWithinAGroup()
    {
        PlaceDetails paris = new("paris", "Novita", "", 48.85, 2.35);
        PlaceDetails caen = new("caen", "Novita", "", 49.18, -0.37);
        PlaceDetails newYork = new("ny", "Novita", "", 40.71, -74.00);

        List<PlaceDetails> ranked = PlaceRanking.Rank([paris, newYork, caen], "novita", Caen).ToList();

        Assert.Equal(["caen", "paris", "ny"], ranked.Select(p => p.PlaceId));
    }

    /// <summary>
    /// Places without coordinates come last in their group.
    /// </summary>
    [Fact]
    public void Rank_PutsPlacesWithoutCoordinatesLastInTheirGroup()
    {
        PlaceDetails noCoordinates = new("unknown", "Novita", "", null, null);
        PlaceDetails farAway = new("ny", "Novita", "", 40.71, -74.00);

        List<PlaceDetails> ranked = PlaceRanking.Rank([noCoordinates, farAway], "novita", Caen).ToList();

        Assert.Equal(["ny", "unknown"], ranked.Select(p => p.PlaceId));
    }
}
