using api.Models;
using api.Services;
using Api.Tests.Fakes;
using Supabase.Postgrest.Interfaces;

namespace Api.Tests.Services;

/// <summary>
/// Tests the Supabase-backed <see cref="TierlistService"/> rules that need no database, and the queries it sends, by
/// generating their URL without sending them.
/// </summary>
public class TierlistServiceTests
{
    /// <summary>
    /// The service refuses a missing dependency instead of failing on the first query.
    /// </summary>
    [Fact]
    public void Constructor_NullDependency_Throws()
    {
        Supabase.Client supabase = new("http://localhost", "test-key", new Supabase.SupabaseOptions { AutoConnectRealtime = false });

        Assert.Equal("supabase", Assert.Throws<ArgumentNullException>(
            () => new TierlistService(null!, new FakeRestaurantService())).ParamName);
        Assert.Equal("restaurantService", Assert.Throws<ArgumentNullException>(
            () => new TierlistService(supabase, null!)).ParamName);
    }

    /// <summary>
    /// The query of a restaurant row of a tierlist (sent to remove it) filters on both the tierlist and the restaurant,
    /// so the delete never removes the other restaurants of the tierlist, nor the restaurant from other tierlists.
    /// </summary>
    [Fact]
    public void EntryQuery_FiltersOnTierlistAndRestaurant()
    {
        IPostgrestTable<TierlistRestaurant> table = new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<TierlistRestaurant>();

        string url = Uri.UnescapeDataString(TierlistService.EntryQuery(table, 7, "r1").GenerateUrl());

        Assert.Contains("id_tierlist=eq.7", url);
        Assert.Contains("id_restaurant=eq.r1", url);
    }

    /// <summary>
    /// The query of a restaurant in several tierlists (sent to remove it from the tierlists of a user who no longer
    /// rates it) filters on those tierlists and the restaurant, so the delete never removes other restaurants nor
    /// touches other users' tierlists.
    /// </summary>
    [Fact]
    public void EntriesQuery_FiltersOnTierlistsAndRestaurant()
    {
        IPostgrestTable<TierlistRestaurant> table = new Supabase.Postgrest.Client("http://localhost/rest/v1").Table<TierlistRestaurant>();

        string url = Uri.UnescapeDataString(TierlistService.EntriesQuery(table, [7, 9], "r1").GenerateUrl());

        // The ids are quoted, which PostgREST casts to the type of the column
        Assert.Contains("id_tierlist=in.(\"7\",\"9\")", url);
        Assert.Contains("id_restaurant=eq.r1", url);
    }
}
