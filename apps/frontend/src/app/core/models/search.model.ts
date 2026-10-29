/**
 * First results of a search (GET /api/places/search, GET /api/users/search). Asking again with a bigger limit returns
 * the same first results followed by the next ones ("Show more").
 */
export interface SearchPage<T> {
  /**
   * The best results first, at most the number asked for; empty when the query is too short
   */
  results: T[];

  /**
   * True when asking for more results would return more ("Show more")
   */
  hasMore: boolean;
}
