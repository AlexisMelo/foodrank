using api.Common;
using api.Models;
using api.Services;

namespace Api.Tests.Fakes;

/// <summary>
/// In-memory <see cref="IUserService"/>, replacing the Supabase-backed one in API tests. Reads and saves the profiles
/// and ratings of <see cref="FakeRatingService"/>, with the same rules as the real service (user ids are uuids,
/// usernames are unique, the search follows <see cref="UserRanking"/>).
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
            ratings.Profiles[userId],
            ratings.Ratings.Where(r => r.UserId == userId).Select(r => r.RestaurantId));
        return Task.FromResult(Result<UserProfileResponse>.Success(profile));
    }

    /// <inheritdoc />
    public Task<Result<ProfileDetailsResponse>> GetDetailsAsync(string userId, int currentYear, CancellationToken cancellationToken)
        => Task.FromResult(ratings.Profiles.TryGetValue(userId, out Profile? profile)
            ? Result<ProfileDetailsResponse>.Success(ProfileDetailsResponse.From(profile, currentYear))
            : Result<ProfileDetailsResponse>.Failure(UserIds.NotFound));

    /// <inheritdoc />
    public Task<Result<ProfileDetailsResponse>> UpdateDetailsAsync(string userId, UpdateProfileDetailsRequest request, int currentYear, CancellationToken cancellationToken)
    {
        if (!ratings.Profiles.TryGetValue(userId, out Profile? profile))
            return Task.FromResult(Result<ProfileDetailsResponse>.Failure(UserIds.NotFound));

        request.ApplyTo(profile, currentYear);
        return Task.FromResult(Result<ProfileDetailsResponse>.Success(ProfileDetailsResponse.From(profile, currentYear)));
    }

    /// <inheritdoc />
    public Task<SearchPage<UserSummaryResponse>> SearchAsync(string query, int limit, string excludedUserId, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < UserRanking.MinQueryLength)
            return Task.FromResult(new SearchPage<UserSummaryResponse>([], false));

        IReadOnlyList<Profile> ranked = UserRanking.Rank(ratings.Profiles.Values.Where(p => p.Id != excludedUserId), trimmed);
        List<UserSummaryResponse> shown = ranked.Take(limit).Select(UserSummaryResponse.From).ToList();
        return Task.FromResult(new SearchPage<UserSummaryResponse>(shown, ranked.Count > limit));
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<UserSummaryResponse>> GetProfilesAsync(IReadOnlyList<string> userIds, CancellationToken cancellationToken)
    {
        IReadOnlyList<UserSummaryResponse> users = userIds
            .Select(id => UserSummaryResponse.From(ratings.Profiles[id]))
            .ToList();
        return Task.FromResult(users);
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
