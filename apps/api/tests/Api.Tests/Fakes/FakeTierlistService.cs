using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ITierlistService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as
/// the real service: the id and dates are generated on creation, user ids are uuids, only the owner changes a tierlist,
/// and only a restaurant the owner rated (active rating) can be added, once.
/// </summary>
/// <param name="restaurantService">Restaurants that can be added to the tierlists.</param>
/// <param name="ratingService">Ratings telling whether the owner rated a restaurant.</param>
public class FakeTierlistService(FakeRestaurantService restaurantService, FakeRatingService ratingService) : ITierlistService
{
    /// <summary>
    /// Tierlists "stored in the database".
    /// </summary>
    public List<Tierlist> Tierlists { get; } = [];

    /// <summary>
    /// Restaurants of the tierlists "stored in the database".
    /// </summary>
    public List<TierlistRestaurant> Restaurants { get; } = [];

    /// <inheritdoc />
    public Task<Result<TierlistResponse>> CreateAsync(string userId, CreateTierlistRequest request, CancellationToken cancellationToken)
    {
        Tierlist tierlist = request.ToTierlist(userId);
        tierlist.Id = Tierlists.Count == 0 ? 1 : Tierlists.Max(t => t.Id) + 1;
        tierlist.CreatedAt = DateTime.UtcNow;
        tierlist.UpdatedAt = tierlist.CreatedAt;
        Tierlists.Add(tierlist);
        return Task.FromResult(Result<TierlistResponse>.Success(TierlistResponse.From(tierlist, [])));
    }

    /// <inheritdoc />
    public Task<Result<IReadOnlyList<TierlistResponse>>> GetByUserAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Task.FromResult(Result<IReadOnlyList<TierlistResponse>>.Failure(UserIds.NotFound));

        List<TierlistResponse> tierlists = Tierlists
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(WithRestaurants)
            .ToList();
        return Task.FromResult(Result<IReadOnlyList<TierlistResponse>>.Success(tierlists));
    }

    /// <inheritdoc />
    public Task<Result<TierlistResponse>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        Tierlist? tierlist = Tierlists.FirstOrDefault(t => t.Id == id);
        return Task.FromResult(tierlist is null
            ? Result<TierlistResponse>.Failure(TierlistService.NotFound)
            : Result<TierlistResponse>.Success(WithRestaurants(tierlist)));
    }

    /// <inheritdoc />
    public Task<Result<TierlistResponse>> SetPinnedAsync(long id, string userId, bool pinned, CancellationToken cancellationToken)
    {
        Tierlist? tierlist = Tierlists.FirstOrDefault(t => t.Id == id);
        if (tierlist is null)
            return Task.FromResult(Result<TierlistResponse>.Failure(TierlistService.NotFound));
        if (!tierlist.IsOwnedBy(userId))
            return Task.FromResult(Result<TierlistResponse>.Failure(TierlistService.NotOwner));

        tierlist.Pinned = pinned;
        tierlist.UpdatedAt = DateTime.UtcNow;
        return Task.FromResult(Result<TierlistResponse>.Success(WithRestaurants(tierlist)));
    }

    /// <inheritdoc />
    public async Task<Result<TierlistResponse>> AddRestaurantAsync(long id, string userId, string restaurantId, CancellationToken cancellationToken)
    {
        Tierlist? tierlist = Tierlists.FirstOrDefault(t => t.Id == id);
        if (tierlist is null)
            return Result<TierlistResponse>.Failure(TierlistService.NotFound);
        if (!tierlist.IsOwnedBy(userId))
            return Result<TierlistResponse>.Failure(TierlistService.NotOwner);

        Result<Restaurant> restaurant = await restaurantService.GetByIdAsync(restaurantId, cancellationToken);
        if (!restaurant.IsSuccess)
            return Result<TierlistResponse>.Failure(restaurant.Error!);
        if (Restaurants.Any(r => r.TierlistId == id && r.RestaurantId == restaurantId))
            return Result<TierlistResponse>.Failure(TierlistService.RestaurantAlreadyAdded);
        if (!ratingService.Ratings.Any(r => r.RestaurantId == restaurantId && r.UserId == userId && r.IsActive))
            return Result<TierlistResponse>.Failure(TierlistService.RestaurantNotRated);

        DateTime now = DateTime.UtcNow;
        Restaurants.Add(new TierlistRestaurant { TierlistId = id, RestaurantId = restaurantId, AddedAt = now });
        tierlist.UpdatedAt = now;
        return Result<TierlistResponse>.Success(WithRestaurants(tierlist));
    }

    /// <inheritdoc />
    public Task<Result<TierlistResponse>> RemoveRestaurantAsync(long id, string userId, string restaurantId, CancellationToken cancellationToken)
    {
        Tierlist? tierlist = Tierlists.FirstOrDefault(t => t.Id == id);
        if (tierlist is null)
            return Task.FromResult(Result<TierlistResponse>.Failure(TierlistService.NotFound));
        if (!tierlist.IsOwnedBy(userId))
            return Task.FromResult(Result<TierlistResponse>.Failure(TierlistService.NotOwner));
        if (Restaurants.RemoveAll(r => r.TierlistId == id && r.RestaurantId == restaurantId) == 0)
            return Task.FromResult(Result<TierlistResponse>.Failure(TierlistService.RestaurantNotInTierlist));

        tierlist.UpdatedAt = DateTime.UtcNow;
        return Task.FromResult(Result<TierlistResponse>.Success(WithRestaurants(tierlist)));
    }

    /// <inheritdoc />
    public Task RemoveRestaurantFromAllAsync(string userId, string restaurantId, CancellationToken cancellationToken)
    {
        foreach (Tierlist tierlist in Tierlists.Where(t => t.IsOwnedBy(userId)))
        {
            if (Restaurants.RemoveAll(r => r.TierlistId == tierlist.Id && r.RestaurantId == restaurantId) > 0)
                tierlist.UpdatedAt = DateTime.UtcNow;
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// Maps a tierlist with its restaurants from <see cref="Restaurants"/>.
    /// </summary>
    private TierlistResponse WithRestaurants(Tierlist tierlist)
        => TierlistResponse.From(tierlist, Restaurants.Where(r => r.TierlistId == tierlist.Id));
}
