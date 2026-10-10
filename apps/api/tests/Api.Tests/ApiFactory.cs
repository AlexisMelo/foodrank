using api.Services;
using api.Services.Places;
using Api.Tests.Fakes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Api.Tests;

/// <summary>
/// Runs the real API in memory (routing, controllers, rate limiting...) with fakes instead of Supabase and OpenStreetMap,
/// so tests never depend on the network or on appsettings.Development.json.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    /// <summary>
    /// Place provider used by the real <see cref="PlaceSearchService"/>; configure its results in the tests.
    /// </summary>
    public FakePlaceProvider PlaceProvider { get; } = new();

    /// <summary>
    /// Restaurant service used by the controllers; fill its restaurants in the tests.
    /// </summary>
    public FakeRestaurantService RestaurantService { get; } = new();

    /// <summary>
    /// Rating service used by the controllers, attached to the restaurants of <see cref="RestaurantService"/>.
    /// </summary>
    public FakeRatingService RatingService { get; }

    /// <summary>
    /// User service used by the controllers, reading the profiles and ratings of <see cref="RatingService"/>.
    /// </summary>
    public FakeUserService UserService { get; }

    /// <summary>
    /// Tierlist service used by the controllers; read the created tierlists in the tests.
    /// </summary>
    public FakeTierlistService TierlistService { get; } = new();

    /// <summary>
    /// Supabase Auth replacement; register the valid tokens in the tests.
    /// </summary>
    public FakeSupabaseAuthService AuthService { get; } = new();

    /// <summary>
    /// Creates the fakes that depend on each other.
    /// </summary>
    public ApiFactory()
    {
        RatingService = new FakeRatingService(RestaurantService);
        UserService = new FakeUserService(RatingService);
    }

    /// <summary>
    /// Uses a dedicated environment with dummy settings, and replaces external dependencies with the fakes.
    /// </summary>
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Supabase:Url", "http://supabase.test");
        builder.UseSetting("Supabase:ServiceRoleKey", "test-key");
        builder.UseSetting("Frontend:Url", "http://localhost:5173");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IPlaceProvider>();
            services.AddSingleton<IPlaceProvider>(PlaceProvider);
            services.RemoveAll<IRestaurantService>();
            services.AddSingleton<IRestaurantService>(RestaurantService);
            services.RemoveAll<IRatingService>();
            services.AddSingleton<IRatingService>(RatingService);
            services.RemoveAll<IUserService>();
            services.AddSingleton<IUserService>(UserService);
            services.RemoveAll<ITierlistService>();
            services.AddSingleton<ITierlistService>(TierlistService);
            services.RemoveAll<ISupabaseAuthService>();
            services.AddSingleton<ISupabaseAuthService>(AuthService);
        });
    }
}
