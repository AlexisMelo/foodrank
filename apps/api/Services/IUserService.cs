using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Reads and saves the profile of users: their public profile, and the private details (identity, age) only the user
/// reads and edits. Their ratings are read by <see cref="IRatingService"/>.
/// </summary>
public interface IUserService
{
    /// <summary>
    /// Returns the profile of <paramref name="userId"/> with the number of distinct restaurants it rated.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The profile, or a NotFound failure when <paramref name="userId"/> is not a user id (uuid).</returns>
    Task<Result<UserProfileResponse>> GetProfileAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the profile of <paramref name="userId"/> as the user edits it, with its private fields (identity, age).
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user.</param>
    /// <param name="currentYear">Current year, from which the birth year is turned back into an age.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The details, or a NotFound failure when the user has no profile row.</returns>
    Task<Result<ProfileDetailsResponse>> GetDetailsAsync(string userId, int currentYear, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the display name, identity and age of <paramref name="userId"/>, leaving the username and avatar as they
    /// are.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user.</param>
    /// <param name="request">New values, already validated.</param>
    /// <param name="currentYear">Current year, from which the age is turned into a birth year.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The saved details, or a NotFound failure when the user has no profile row.</returns>
    Task<Result<ProfileDetailsResponse>> UpdateDetailsAsync(string userId, UpdateProfileDetailsRequest request, int currentYear, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the first <paramref name="limit"/> users whose username or display name contains
    /// <paramref name="query"/>, ignoring case, ranked by <see cref="UserRanking.Rank"/>, without the number of
    /// restaurants each one rated (it would read the ratings of every user found). Asking again with a bigger limit
    /// returns the same first users followed by the next ones ("Show more").
    /// </summary>
    /// <param name="query">Text typed by the user; shorter than <see cref="UserRanking.MinQueryLength"/> characters once
    /// trimmed, it returns no user.</param>
    /// <param name="limit">Maximum number of users, from 1 to <see cref="UserRanking.MaxResults"/>.</param>
    /// <param name="excludedUserId">Supabase Auth id of the user searching, left out of the results.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The users (id, username, display name, avatar), best matches first, and whether there are more.</returns>
    Task<SearchPage<UserSummaryResponse>> SearchAsync(string query, int limit, string excludedUserId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the names and avatar of <paramref name="userIds"/>, in the same order, in a single query on the profiles
    /// (no number of restaurants rated).
    /// </summary>
    /// <param name="userIds">Supabase Auth ids of the users (uuids), e.g. the followers of a user.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>One user per id, in the order of <paramref name="userIds"/>; empty when it is empty.</returns>
    Task<IReadOnlyList<UserSummaryResponse>> GetProfilesAsync(IReadOnlyList<string> userIds, CancellationToken cancellationToken);

    /// <summary>
    /// Tells whether a profile already uses <paramref name="username"/>.
    /// </summary>
    /// <param name="username">Username to look for, compared exactly like the database unique constraint.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>True when another user already has this username.</returns>
    Task<bool> IsUsernameTakenAsync(string username, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the profile of a user, replacing the row of the same id when there is one (e.g. created by the database
    /// with the account).
    /// </summary>
    /// <param name="profile">Profile to save.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>The saved profile, or a Conflict failure when its username is already used by another user.</returns>
    Task<Result<Profile>> SaveProfileAsync(Profile profile, CancellationToken cancellationToken);
}
