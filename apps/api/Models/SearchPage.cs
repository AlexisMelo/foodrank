namespace api.Models;

/// <summary>
/// First results of a search, returned by GET /api/places/search and GET /api/users/search. Asking again with a bigger
/// limit returns the same first results followed by the next ones ("Show more").
/// </summary>
/// <typeparam name="T">Type of a result.</typeparam>
/// <param name="Results">The best results first, at most the number asked for.</param>
/// <param name="HasMore">True when asking for more results would return more ("Show more").</param>
public record SearchPage<T>(IReadOnlyList<T> Results, bool HasMore);
