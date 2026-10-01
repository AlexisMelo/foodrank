using api.Common;
using api.Models;
using api.Services;

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
    public Task<Result<Restaurant>> GetOrCreateFromPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        Restaurant? restaurant = Restaurants.FirstOrDefault(r => r.OsmId == placeId);
        if (restaurant is null)
        {
            restaurant = new Restaurant { Id = Guid.NewGuid().ToString(), OsmId = placeId, Name = placeId };
            Restaurants.Add(restaurant);
        }
        return Task.FromResult(Result<Restaurant>.Success(restaurant));
    }
}
