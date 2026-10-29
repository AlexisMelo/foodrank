using System.Text;
using api.Models;

namespace api.Services;

/// <summary>
/// Rules of the user search (GET /api/users/search), shared by <see cref="UserService"/> and the in-memory service of
/// the tests: users are found by their pseudonym, ignoring case.
/// </summary>
public static class UserRanking
{
    /// <summary>
    /// Shortest query searched once trimmed, same as the shortest pseudonym (<see cref="SignupRequest.UsernameMinLength"/>);
    /// shorter queries return no user.
    /// </summary>
    public const int MinQueryLength = SignupRequest.UsernameMinLength;

    /// <summary>
    /// Maximum number of users of a search, which is also the number of profiles read from the database (alphabetically)
    /// for every search whatever the limit asked: ranking the same candidates keeps the first users in place when more
    /// are asked, and the best matches (same pseudonym, or starting with the query) are still among them when more
    /// pseudonyms than asked contain the query.
    /// </summary>
    public const int MaxResults = 50;

    /// <summary>
    /// Builds the ILIKE pattern of the pseudonyms containing <paramref name="query"/>: the LIKE wildcards it contains
    /// (<c>%</c>, <c>_</c>) and the escape character (<c>\</c>) are escaped so they match themselves. PostgREST reads
    /// <c>*</c> as <c>%</c>, so a <c>*</c> becomes <c>_</c> (any character): <see cref="Rank"/> then drops the profiles
    /// it wrongly matched.
    /// </summary>
    /// <param name="query">Query, already trimmed.</param>
    /// <returns>The pattern, e.g. <c>%ali%</c> for "ali" and <c>%50\%%</c> for "50%".</returns>
    public static string LikePattern(string query)
    {
        StringBuilder pattern = new("%");
        foreach (char c in query)
        {
            if (c is '\\' or '%' or '_')
                pattern.Append('\\').Append(c);
            else
                pattern.Append(c == '*' ? '_' : c);
        }
        return pattern.Append('%').ToString();
    }

    /// <summary>
    /// Keeps the profiles whose pseudonym contains <paramref name="query"/> (ignoring case), best matches first: the
    /// same pseudonym, then those starting with the query, then the others; alphabetically within each group.
    /// </summary>
    /// <param name="profiles">Candidate profiles; those without pseudonym are dropped.</param>
    /// <param name="query">Query, already trimmed.</param>
    /// <returns>At most <see cref="MaxResults"/> profiles.</returns>
    public static IReadOnlyList<Profile> Rank(IEnumerable<Profile> profiles, string query)
        => profiles
            .Where(p => p.Username is not null && p.Username.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => MatchGroup(p.Username!, query))
            .ThenBy(p => p.Username, StringComparer.OrdinalIgnoreCase)
            .Take(MaxResults)
            .ToList();

    /// <summary>
    /// Group of a pseudonym containing the query: 0 when it is the query, 1 when it starts with it, 2 otherwise.
    /// </summary>
    private static int MatchGroup(string username, string query)
    {
        if (username.Equals(query, StringComparison.OrdinalIgnoreCase))
            return 0;
        return username.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 1 : 2;
    }
}
