using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Reads and saves users' profiles in the "profiles" table. A single profile comes with the number of restaurants the
/// user rated, from the "rating" table; lists of users only read the "profiles" table.
/// </summary>
/// <param name="supabase">Client of the Supabase database.</param>
public class UserService(Supabase.Client supabase) : IUserService
{
    /// <summary>
    /// Error returned when saving a profile with the username of another user.
    /// </summary>
    public static Error UsernameTaken { get; } = new(ErrorType.Conflict, "This username is already taken.");

    /// <summary>
    /// Client of the Supabase database.
    /// </summary>
    private readonly Supabase.Client _supabase = supabase ?? throw new ArgumentNullException(nameof(supabase));

    /// <inheritdoc />
    public async Task<Result<UserProfileResponse>> GetProfileAsync(string userId, CancellationToken cancellationToken)
    {
        if (!UserIds.IsValid(userId))
            return Result<UserProfileResponse>.Failure(UserIds.NotFound);

        ModeledResponse<Profile> profiles = await _supabase.From<Profile>()
            .Where(p => p.Id == userId)
            .Limit(1)
            .Get(cancellationToken);
        // Only the restaurant column is needed to count the distinct restaurants rated
        ModeledResponse<Rating> ratings = await _supabase.From<Rating>()
            .Select("id_restaurant")
            .Where(r => r.UserId == userId)
            .Get(cancellationToken);

        return Result<UserProfileResponse>.Success(
            UserProfileResponse.From(profiles.Models.First(), ratings.Models.Select(r => r.RestaurantId)));
    }

    /// <inheritdoc />
    public async Task<Result<ProfileDetailsResponse>> GetDetailsAsync(string userId, int currentYear, CancellationToken cancellationToken)
    {
        Profile? profile = await FindProfileAsync(userId, cancellationToken);
        return profile is null
            ? Result<ProfileDetailsResponse>.Failure(UserIds.NotFound)
            : Result<ProfileDetailsResponse>.Success(ProfileDetailsResponse.From(profile, currentYear));
    }

    /// <inheritdoc />
    public async Task<Result<ProfileDetailsResponse>> UpdateDetailsAsync(string userId, UpdateProfileDetailsRequest request, int currentYear, CancellationToken cancellationToken)
    {
        Profile? profile = await FindProfileAsync(userId, cancellationToken);
        if (profile is null)
            return Result<ProfileDetailsResponse>.Failure(UserIds.NotFound);

        // Update on the primary key of the row just read: its username and avatar are sent back unchanged
        request.ApplyTo(profile, currentYear);
        ModeledResponse<Profile> updated = await _supabase.From<Profile>().Update(profile, cancellationToken: cancellationToken);
        return Result<ProfileDetailsResponse>.Success(
            ProfileDetailsResponse.From(updated.Models.FirstOrDefault() ?? profile, currentYear));
    }

    /// <summary>
    /// Reads the profile row of <paramref name="userId"/>.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user (a uuid).</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The row, null when the user has none.</returns>
    private async Task<Profile?> FindProfileAsync(string userId, CancellationToken cancellationToken)
    {
        ModeledResponse<Profile> profiles = await _supabase.From<Profile>()
            .Where(p => p.Id == userId)
            .Limit(1)
            .Get(cancellationToken);
        return profiles.Models.FirstOrDefault();
    }

    /// <inheritdoc />
    public async Task<SearchPage<UserSummaryResponse>> SearchAsync(string query, int limit, string excludedUserId, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < UserRanking.MinQueryLength)
            return new SearchPage<UserSummaryResponse>([], false);

        // One query per name rather than an Or(): the client does not quote the values of an or=(...) filter, so a
        // query holding "," or ")" would break it
        string pattern = UserRanking.LikePattern(trimmed);
        IReadOnlyList<Profile> byUsername = await FindCandidatesAsync("username", pattern, excludedUserId, cancellationToken);
        IReadOnlyList<Profile> byDisplayName = await FindCandidatesAsync("display_name", pattern, excludedUserId, cancellationToken);

        IReadOnlyList<Profile> ranked = UserRanking.Rank(byUsername.Concat(byDisplayName), trimmed);
        return new SearchPage<UserSummaryResponse>(
            ranked.Take(limit).Select(UserSummaryResponse.From).ToList(),
            ranked.Count > limit);
    }

    /// <summary>
    /// Reads the first <see cref="UserRanking.MaxResults"/> profiles whose <paramref name="column"/> matches
    /// <paramref name="pattern"/>, alphabetically on that column, without <paramref name="excludedUserId"/>.
    /// </summary>
    /// <param name="column">Name column searched: "username" or "display_name".</param>
    /// <param name="pattern">ILIKE pattern built by <see cref="UserRanking.LikePattern"/>.</param>
    /// <param name="excludedUserId">Supabase Auth id of the user searching, left out.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The candidate profiles, to rank with <see cref="UserRanking.Rank"/>.</returns>
    private async Task<IReadOnlyList<Profile>> FindCandidatesAsync(string column, string pattern, string excludedUserId, CancellationToken cancellationToken)
    {
        ModeledResponse<Profile> candidates = await _supabase.From<Profile>()
            .Filter(column, Constants.Operator.ILike, pattern)
            .Not("id", Constants.Operator.Equals, excludedUserId)
            .Order(column, Constants.Ordering.Ascending)
            .Limit(UserRanking.MaxResults)
            .Get(cancellationToken);
        return candidates.Models;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<UserSummaryResponse>> GetProfilesAsync(IReadOnlyList<string> userIds, CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
            return [];

        ModeledResponse<Profile> profiles = await _supabase.From<Profile>()
            .Filter("id", Constants.Operator.In, userIds.Cast<object>().ToList())
            .Get(cancellationToken);
        Dictionary<string, Profile> profilesById = profiles.Models.ToDictionary(p => p.Id);

        return userIds.Select(id => UserSummaryResponse.From(profilesById[id])).ToList();
    }

    /// <inheritdoc />
    public async Task<bool> IsUsernameTakenAsync(string username, CancellationToken cancellationToken)
    {
        ModeledResponse<Profile> profiles = await _supabase.From<Profile>()
            .Select("id")
            .Where(p => p.Username == username)
            .Limit(1)
            .Get(cancellationToken);
        return profiles.Models.Count > 0;
    }

    /// <inheritdoc />
    public async Task<Result<Profile>> SaveProfileAsync(Profile profile, CancellationToken cancellationToken)
    {
        try
        {
            ModeledResponse<Profile> saved = await _supabase.From<Profile>().Upsert(profile, cancellationToken: cancellationToken);
            return Result<Profile>.Success(saved.Models.FirstOrDefault() ?? profile);
        }
        catch (PostgrestException ex) when (PostgrestErrors.IsUniqueViolation(ex))
        {
            // Another user took the username since it was checked
            return Result<Profile>.Failure(UsernameTaken);
        }
    }
}
