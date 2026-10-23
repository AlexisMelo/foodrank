using api.Services.Places;
using Microsoft.Extensions.Configuration;

namespace Api.Tests.Services.Places;

/// <summary>
/// Tests the resolution of the position searches and suggestions are centered on.
/// </summary>
public class SearchPositionTests
{
    /// <summary>
    /// Builds settings holding only <paramref name="values"/>.
    /// </summary>
    private static IConfiguration Settings(Dictionary<string, string?> values) => new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    /// <summary>
    /// A complete position within range is the user's.
    /// </summary>
    [Fact]
    public void FromQuery_ValidPosition_ReturnsIt()
    {
        Assert.Equal(new GeoPoint(49.18, -0.37), SearchPosition.FromQuery(49.18, -0.37));
    }

    /// <summary>
    /// A missing, partial or out of range position is unknown.
    /// </summary>
    [Theory]
    [InlineData(null, null)]
    [InlineData(49.18, null)]
    [InlineData(null, -0.37)]
    [InlineData(91.0, 0.0)]
    [InlineData(0.0, 181.0)]
    public void FromQuery_InvalidPosition_ReturnsNull(double? lat, double? lon)
    {
        Assert.Null(SearchPosition.FromQuery(lat, lon));
    }

    /// <summary>
    /// The default position is the configured city.
    /// </summary>
    [Fact]
    public void Default_Configured_ReturnsConfiguredCity()
    {
        IConfiguration settings = Settings(new() { ["Places:DefaultLocation:Lat"] = "49.1829", ["Places:DefaultLocation:Lon"] = "-0.3707" });

        Assert.Equal(new GeoPoint(49.1829, -0.3707), SearchPosition.Default(settings));
    }

    /// <summary>
    /// Without a valid configured city, the default position is Paris.
    /// </summary>
    [Theory]
    [InlineData(null, null)]
    [InlineData("100", "0")]
    public void Default_NotConfiguredOrInvalid_FallsBackToParis(string? lat, string? lon)
    {
        IConfiguration settings = Settings(new() { ["Places:DefaultLocation:Lat"] = lat, ["Places:DefaultLocation:Lon"] = lon });

        Assert.Equal(new GeoPoint(48.8566, 2.3522), SearchPosition.Default(settings));
    }
}
