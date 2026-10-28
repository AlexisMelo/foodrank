using api.Common;
using api.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Responses;

namespace api.Services;

/// <summary>
/// Reads and saves users' profiles in the "profiles" table, with the number of restaurants they rated from the
/// "rating" table.
/// </summary>
/// <param name="supabase">Client of the Supabase database.</param>
public class UserService(Supabase.Client supabase) : IUserService
{
    /// <summary>
    /// Error returned when saving a profile with the pseudonym of another user.
    /// </summary>
    public static Error UsernameTaken { get; } = new(ErrorType.Conflict, "This pseudonym is already taken.");

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
            UserProfileResponse.From(userId, profiles.Models.FirstOrDefault(), ratings.Models.Select(r => r.RestaurantId)));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<UserProfileResponse>> SearchAsync(string query, string excludedUserId, CancellationToken cancellationToken)
    {
        string trimmed = query.Trim();
        if (trimmed.Length < UserRanking.MinQueryLength)
            return [];

        ModeledResponse<Profile> candidates = await _supabase.From<Profile>()
            .Filter("username", Constants.Operator.ILike, UserRanking.LikePattern(trimmed))
            .Not("id", Constants.Operator.Equals, excludedUserId)
            .Order("username", Constants.Ordering.Ascending)
            .Limit(UserRanking.CandidatesCount)
            .Get(cancellationToken);
        IReadOnlyList<Profile> found = UserRanking.Rank(candidates.Models, trimmed);
        if (found.Count == 0)
            return [];

        // Only the user and restaurant columns are needed to count the distinct restaurants each user rated
        List<object> userIds = found.Select(p => p.Id).Cast<object>().ToList();
        ModeledResponse<Rating> ratings = await _supabase.From<Rating>()
            .Select("id_user,id_restaurant")
            .Filter("id_user", Constants.Operator.In, userIds)
            .Get(cancellationToken);
        ILookup<string, string> ratedRestaurantIds = ratings.Models.ToLookup(r => r.UserId, r => r.RestaurantId);

        return found.Select(p => UserProfileResponse.From(p.Id, p, ratedRestaurantIds[p.Id])).ToList();
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
            // Another user took the pseudonym since it was checked
            return Result<Profile>.Failure(UsernameTaken);
        }
    }
}
