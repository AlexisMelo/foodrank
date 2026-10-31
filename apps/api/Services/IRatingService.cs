using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Saves and reads the ratings users give to restaurants. A new rating becomes the user's active rating of the
/// restaurant and the previous one is deactivated (stored "is_active" flag), so only the latest one is active.
/// </summary>
public interface IRatingService
{
    /// <summary>
    /// Saves today's rating of <paramref name="restaurantId"/> by <paramref name="userId"/> as their active rating,
    /// deactivating the previous one. Fails with NotFound when the restaurant does not exist, and Conflict when the user
    /// already rated a restaurant today (see <see cref="RatingAllowanceResponse"/>).
    /// </summary>
    Task<Result<Rating>> CreateAsync(string restaurantId, string userId, RateRestaurantRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Tells whether <paramref name="userId"/> can rate a restaurant now: a user rates at most one restaurant per day (UTC).
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database query.</param>
    /// <returns>Whether the user can rate, and when they can rate again when they cannot.</returns>
    Task<Result<RatingAllowanceResponse>> GetAllowanceAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the <paramref name="count"/> most recent active ratings of <paramref name="restaurantId"/> (each user's
    /// latest), all users included, most recent first. Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetRecentAsync(string restaurantId, int count, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the <paramref name="count"/> most recent active ratings of <paramref name="restaurantId"/> (each user's
    /// latest) given by the users <paramref name="userId"/> follows, most recent first.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the logged-in user, read from the session.</param>
    /// <param name="count">Maximum number of ratings.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings with their author, empty when the user follows nobody who rated the restaurant, or a
    /// NotFound failure when the restaurant does not exist.</returns>
    Task<Result<IReadOnlyList<RatingResponse>>> GetRecentFromFollowedUsersAsync(string restaurantId, string userId, int count, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the averages of every active rating of <paramref name="restaurantId"/> (each user's latest), per
    /// criterion and globally. Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<RatingSummaryResponse>> GetSummaryAsync(string restaurantId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every rating of <paramref name="restaurantId"/> by <paramref name="userId"/>, most recent first.
    /// Fails with NotFound when the restaurant does not exist.
    /// </summary>
    Task<Result<IReadOnlyList<RatingResponse>>> GetByRestaurantAndUserAsync(string restaurantId, string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes the rating of <paramref name="restaurantId"/> given by <paramref name="userId"/> at
    /// <paramref name="date"/>. When it was their active rating, their previous one becomes active (see
    /// <see cref="Rating.PlanDeletion"/>); when it was their only one, the restaurant is removed from their tierlists,
    /// which only hold rated restaurants.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the logged-in user, read from the session: only their ratings are
    /// deleted.</param>
    /// <param name="date">Moment of the rating, as returned by the API.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings the user has left for the restaurant, most recent first; a NotFound failure when the
    /// restaurant does not exist or the user gave no rating of it at <paramref name="date"/>.</returns>
    Task<Result<IReadOnlyList<RatingResponse>>> DeleteAsync(string restaurantId, string userId, DateTimeOffset date, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes every rating of <paramref name="restaurantId"/> given by <paramref name="userId"/>, and removes the
    /// restaurant from their tierlists, which only hold rated restaurants.
    /// </summary>
    /// <param name="restaurantId">Database id of the restaurant.</param>
    /// <param name="userId">Supabase Auth id of the logged-in user, read from the session: only their ratings are
    /// deleted.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings the user has left for the restaurant (none); a NotFound failure when the restaurant does
    /// not exist.</returns>
    Task<Result<IReadOnlyList<RatingResponse>>> DeleteAllAsync(string restaurantId, string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns every rating of <paramref name="userId"/>, all restaurants included, most recent first.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the user.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings with their restaurant, or a NotFound failure when <paramref name="userId"/> is not a user id (uuid).</returns>
    Task<Result<IReadOnlyList<UserRatingResponse>>> GetByUserAsync(string userId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns the <paramref name="count"/> most recent ratings given by the users <paramref name="userId"/> follows,
    /// active or not, all restaurants included, most recent first, each with its restaurant and its author.
    /// </summary>
    /// <param name="userId">Supabase Auth id of the logged-in user, read from the session.</param>
    /// <param name="count">Maximum number of ratings.</param>
    /// <param name="cancellationToken">Cancels the database queries.</param>
    /// <returns>The ratings; empty when the user follows nobody or the users followed rated nothing.</returns>
    Task<IReadOnlyList<FollowedRatingResponse>> GetFromFollowedUsersAsync(string userId, int count, CancellationToken cancellationToken);
}
