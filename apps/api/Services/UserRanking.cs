using System.Text;
using api.Common;
using api.Models;

namespace api.Services;

/// <summary>
/// Rules of the user search (GET /api/users/search), shared by <see cref="UserService"/> and the in-memory service of
/// the tests: users are found by their username or their display name, ignoring case.
/// </summary>
public static class UserRanking
{
    /// <summary>
    /// Shortest query searched once trimmed, same as the shortest username (<see cref="UsernameAttribute.MinLength"/>);
    /// shorter queries return no user.
    /// </summary>
    public const int MinQueryLength = UsernameAttribute.MinLength;

    /// <summary>
    /// Maximum number of users of a search, which is also the number of profiles read from the database (alphabetically)
    /// for every search whatever the limit asked, for each name searched: ranking the same candidates keeps the first
    /// users in place when more are asked, and the best matches (same name, or starting with the query) are still among
    /// them when more names than asked contain the query.
    /// </summary>
    public const int MaxResults = 50;

    /// <summary>
    /// Group of a name not containing the query (or of a missing display name): such a name does not match.
    /// </summary>
    private const int NoMatch = 3;

    /// <summary>
    /// Builds the ILIKE pattern of the names containing <paramref name="query"/>: the LIKE wildcards it contains
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
    /// Keeps the profiles whose username or display name contains <paramref name="query"/> (ignoring case), each once,
    /// best matches first: a name equal to the query, then a name starting with it, then the others (a profile ranks by
    /// its better name); alphabetically by displayed name within each group.
    /// </summary>
    /// <param name="profiles">Candidate profiles, possibly found twice (by username and by display name).</param>
    /// <param name="query">Query, already trimmed.</param>
    /// <returns>At most <see cref="MaxResults"/> profiles.</returns>
    public static IReadOnlyList<Profile> Rank(IEnumerable<Profile> profiles, string query)
        => profiles
            .DistinctBy(p => p.Id)
            .Select(p => (Profile: p, Group: Math.Min(MatchGroup(p.Username, query), MatchGroup(Profile.DisplayNameOrNull(p), query))))
            .Where(match => match.Group != NoMatch)
            .OrderBy(match => match.Group)
            .ThenBy(match => Profile.DisplayedName(match.Profile), StringComparer.OrdinalIgnoreCase)
            .ThenBy(match => match.Profile.Username, StringComparer.Ordinal)
            .Take(MaxResults)
            .Select(match => match.Profile)
            .ToList();

    /// <summary>
    /// Group of a name: 0 when it is the query, 1 when it starts with it, 2 when it contains it, <see cref="NoMatch"/>
    /// otherwise.
    /// </summary>
    private static int MatchGroup(string? name, string query)
    {
        if (name is null || !name.Contains(query, StringComparison.OrdinalIgnoreCase))
            return NoMatch;
        if (name.Equals(query, StringComparison.OrdinalIgnoreCase))
            return 0;
        return name.StartsWith(query, StringComparison.OrdinalIgnoreCase) ? 1 : 2;
    }
}
