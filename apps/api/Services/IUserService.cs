using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Reads and saves the public profile of users. Their ratings are read by <see cref="IRatingService"/>.
/// </summary>
public interface IUserService
{
    /// <summary>
    /// Returns the profile of <paramref name="userId"/> with the number of distinct restaurants it rated.
    /// A user without profile row is returned as anonymous.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The profile, or a NotFound failure when <paramref name="userId"/> is not a user id (uuid).</returns>
    Task<Result<UserProfileResponse>> GetProfileAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Tells whether a profile already uses <paramref name="username"/>.
    /// </summary>
    /// <param name="username">Pseudonym to look for, compared exactly like the database unique constraint.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>True when another user already has this pseudonym.</returns>
    Task<bool> IsUsernameTakenAsync(string username, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the profile of a user, replacing the row of the same id when there is one (e.g. created by the database
    /// with the account).
    /// </summary>
    /// <param name="profile">Profile to save.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The saved profile, or a Conflict failure when its pseudonym is already used by another user.</returns>
    Task<Result<Profile>> SaveProfileAsync(Profile profile, CancellationToken cancellationToken);
}
