using api.Models;
using api.Services;

namespace Api.Tests.Services;

/// <summary>
/// Tests the rules of the user search: the ILIKE pattern sent to the database and the ranking of the profiles found.
/// </summary>
public class UserRankingTests
{
    /// <summary>
    /// Profiles of the given pseudonyms, in the given order, with ids "0", "1"...
    /// </summary>
    private static List<Profile> Profiles(params string[] usernames)
        => usernames.Select((username, i) => new Profile { Id = i.ToString(), Username = username }).ToList();

    /// <summary>
    /// The pattern finds the query anywhere in the pseudonym.
    /// </summary>
    [Fact]
    public void LikePattern_MatchesTheQueryAnywhere()
    {
        Assert.Equal("%ali%", UserRanking.LikePattern("ali"));
    }

    /// <summary>
    /// The LIKE wildcards and the escape character typed by the user are escaped, so they only match themselves.
    /// </summary>
    [Theory]
    [InlineData("50%", @"%50\%%")]
    [InlineData("a_b", @"%a\_b%")]
    [InlineData(@"a\b", @"%a\\b%")]
    public void LikePattern_EscapesWildcards(string query, string expected)
    {
        Assert.Equal(expected, UserRanking.LikePattern(query));
    }

    /// <summary>
    /// A "*", read as "%" by PostgREST, becomes a single-character wildcard instead.
    /// </summary>
    [Fact]
    public void LikePattern_StarBecomesSingleCharacterWildcard()
    {
        Assert.Equal("%a_b%", UserRanking.LikePattern("a*b"));
    }

    /// <summary>
    /// The same pseudonym comes first, then those starting with the query, then those containing it; alphabetically
    /// within each group, ignoring case.
    /// </summary>
    [Fact]
    public void Rank_ExactThenStartsWithThenContains()
    {
        List<Profile> profiles = Profiles("Kalimero", "alice", "Ali", "bali", "Alibaba");

        IReadOnlyList<Profile> ranked = UserRanking.Rank(profiles, "ali");

        Assert.Equal(["Ali", "Alibaba", "alice", "bali", "Kalimero"], ranked.Select(p => p.Username));
    }

    /// <summary>
    /// Profiles whose pseudonym does not really contain the query (matched by a "*" turned wildcard) are dropped.
    /// </summary>
    [Fact]
    public void Rank_DropsProfilesNotContainingTheQuery()
    {
        List<Profile> profiles = Profiles("a*b", "axb");

        IReadOnlyList<Profile> ranked = UserRanking.Rank(profiles, "a*b");

        Assert.Equal(["a*b"], ranked.Select(p => p.Username));
    }

    /// <summary>
    /// At most 50 profiles are kept, the most a search returns.
    /// </summary>
    [Fact]
    public void Rank_KeepsAtMost50Profiles()
    {
        List<Profile> profiles = Profiles(Enumerable.Range(10, 60).Select(i => $"user{i}").ToArray());

        IReadOnlyList<Profile> ranked = UserRanking.Rank(profiles, "user");

        Assert.Equal(50, ranked.Count);
        Assert.Equal("user10", ranked[0].Username);
    }
}
