using api.Common;
using api.Models;
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
