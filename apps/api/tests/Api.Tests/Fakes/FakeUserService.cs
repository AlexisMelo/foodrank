using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IUserService"/>, replacing the Supabase-backed one in API tests. Reads the profiles and ratings
/// of <see cref="FakeRatingService"/>, with the same rules as the real service (user ids are uuids).
/// </summary>
/// <param name="ratings">Ratings and profiles "stored in the database".</param>
public class FakeUserService(FakeRatingService ratings) : IUserService
{
    /// <inheritdoc />
    public Task<Result<UserProfileResponse>> GetProfileAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Task.FromResult(Result<UserProfileResponse>.Failure(UserIds.NotFound));

        UserProfileResponse profile = UserProfileResponse.From(
            userId,
            ratings.Profiles.GetValueOrDefault(userId),
            ratings.Ratings.Where(r => r.UserId == userId).Select(r => r.RestaurantId));
        return Task.FromResult(Result<UserProfileResponse>.Success(profile));
    }
}
