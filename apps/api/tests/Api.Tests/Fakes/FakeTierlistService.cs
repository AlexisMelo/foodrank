using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="ITierlistService"/>, replacing the Supabase-backed one in API tests. Generates the id and
/// creation date like the database does.
/// </summary>
public class FakeTierlistService : ITierlistService
{
    /// <summary>
    /// Tierlists "stored in the database".
    /// </summary>
    public List<Tierlist> Tierlists { get; } = [];

    /// <inheritdoc />
    public Task<Result<TierlistResponse>> CreateAsync(string userId, CreateTierlistRequest request, CancellationToken cancellationToken)
    {
        Tierlist tierlist = request.ToTierlist(userId);
        tierlist.Id = Tierlists.Count + 1;
        tierlist.CreatedAt = DateTime.UtcNow;
        Tierlists.Add(tierlist);
        return Task.FromResult(Result<TierlistResponse>.Success(TierlistResponse.From(tierlist)));
    }
}
