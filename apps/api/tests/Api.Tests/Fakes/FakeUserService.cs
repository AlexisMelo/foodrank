using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IUserService"/>, replacing the Supabase-backed one in API tests. Reads and saves the profiles
/// and ratings of <see cref="FakeRatingService"/>, with the same rules as the real service (user ids are uuids,
/// pseudonyms are unique).
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

    /// <inheritdoc />
    public Task<bool> IsUsernameTakenAsync(string username, CancellationToken cancellationToken)
        => Task.FromResult(ratings.Profiles.Values.Any(p => p.Username == username));

    /// <inheritdoc />
    public Task<Result<Profile>> SaveProfileAsync(Profile profile, CancellationToken cancellationToken)
    {
        // Like the unique constraint on "profiles.username"
        if (ratings.Profiles.Values.Any(p => p.Id != profile.Id && p.Username == profile.Username))
            return Task.FromResult(Result<Profile>.Failure(UserService.UsernameTaken));

        ratings.Profiles[profile.Id] = profile;
        return Task.FromResult(Result<Profile>.Success(profile));
    }
}
