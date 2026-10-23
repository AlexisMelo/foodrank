using api.Common;
using api.Models;
using api.Services;
using api.Services.Places;
using Microsoft.Extensions.Configuration;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IRestaurantService"/>, replacing the Supabase-backed one in API tests.
/// </summary>
public class FakeRestaurantService : IRestaurantService
{
    /// <summary>
    /// Restaurants "stored in the database".
    /// </summary>
    public List<Restaurant> Restaurants { get; } = [];

    /// <summary>
    /// Ids of the restaurants a user rated, by user id; none by default. <see cref="ApiFactory"/> reads them from its
    /// rating service (which itself depends on this fake).
    /// </summary>
    public Func<string, IEnumerable<string>> RatedRestaurantIds { get; set; } = _ => [];

    /// <summary>
    /// Position suggestions are sorted from when the user's is unknown: the real fallback (Paris), as no default city
    /// is configured in the tests.
    /// </summary>
    public GeoPoint DefaultPosition { get; set; } = SearchPosition.Default(new ConfigurationBuilder().Build());

    /// <inheritdoc />
    public Task<IReadOnlyList<Restaurant>> GetAllAsync(CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<Restaurant>>(Restaurants);

    /// <inheritdoc />
    public Task<Result<Restaurant>> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        Restaurant? restaurant = Restaurants.FirstOrDefault(r => r.Id == id);
        return Task.FromResult(restaurant is null
            ? Result<Restaurant>.Failure(new Error(ErrorType.NotFound, "Restaurant not found."))
            : Result<Restaurant>.Success(restaurant));
    }

    /// <inheritdoc />
    public Task<Result<RestaurantFromPlaceResponse>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        Restaurant? restaurant = Restaurants.FirstOrDefault(r => r.OsmId == placeId);
        if (restaurant is not null)
            return Task.FromResult(Result<RestaurantFromPlaceResponse>.Success(new RestaurantFromPlaceResponse(restaurant, Created: false)));

        restaurant = new Restaurant { Id = Guid.NewGuid().ToString(), OsmId = placeId, Name = placeId };
        Restaurants.Add(restaurant);
        return Task.FromResult(Result<RestaurantFromPlaceResponse>.Success(new RestaurantFromPlaceResponse(restaurant, Created: true)));
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<RestaurantSuggestionResponse>> GetSuggestionsAsync(string userId, double? lat, double? lon, int limit, CancellationToken cancellationToken)
    {
        // Same rules as the real service: the restaurants the user rated are left out, then ranked
        HashSet<string> ratedIds = RatedRestaurantIds(userId).ToHashSet();
        GeoPoint? userPosition = SearchPosition.FromQuery(lat, lon);
        return Task.FromResult(RestaurantSuggestionResponse.Rank(
            Restaurants.Where(r => !ratedIds.Contains(r.Id)), userPosition ?? DefaultPosition, userPosition is not null, limit));
    }
}
