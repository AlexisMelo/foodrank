using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Reads the public profile of users. Their ratings are read by <see cref="IRatingService"/>.
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
}
