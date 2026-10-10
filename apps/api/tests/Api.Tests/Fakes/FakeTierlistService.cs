using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ITierlistService"/>, replacing the Supabase-backed one in API tests. Follows the same rules as
/// the real service: the id and creation date are generated on creation, and user ids are uuids.
/// </summary>
public class FakeTierlistService : ITierlistService
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
        return Task.FromResult(Result<TierlistResponse>.Success(WithRestaurants(tierlist)));
    }

    /// <summary>
    /// Maps a tierlist with its restaurants from <see cref="Restaurants"/>.
    /// </summary>
    private TierlistResponse WithRestaurants(Tierlist tierlist)
        => TierlistResponse.From(tierlist, Restaurants.Where(r => r.TierlistId == tierlist.Id));
}
