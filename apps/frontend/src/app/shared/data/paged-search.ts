import { Signal, computed, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import type { SearchPage } from '@/core/models/search.model';

/**
 * Number of results added by each "Show more"
 */
export const MORE_RESULTS = 10;

/**
 * Results of a search shown page by page by injectPagedSearch, as read-only signals, and the actions on them.
 */
export interface PagedSearchState<T> {
  /**
   * Results shown, best first, never more than the limit; empty until the first answer of the query, and when the
   * first search failed
   */
  results: Signal<T[]>;

  /**
   * True while the first results of the query load: placeholders are shown
   */
  loading: Signal<boolean>;

  /**
   * True while more results load (or the same ones again), the ones already shown staying
   */
  loadingMore: Signal<boolean>;

  /**
   * True when the last search failed: the first results, or more of them
   */
  failed: Signal<boolean>;

  /**
   * True when the search answered and found nothing
   */
  empty: Signal<boolean>;

  /**
   * True when "Show more" can add results: the last answer said there are more, or has more than the ones shown
   */
  hasMore: Signal<boolean>;

  /**
   * Asks for MORE_RESULTS more results, without going over what the API returns at most
   */
  showMore(): void;

  /**
   * Searches again after a failure, with the same limit
   */
  retry(): void;
}

/**
 * Search shown page by page, loaded by an rxResource of the calling page: the first `firstResults()` results of the
 * query, then MORE_RESULTS more on each "Show more", asked for with a bigger limit. Back to the first results when the
 * query or their number changes, and a late answer for previous params is ignored. The results shown stay while more
 * load, while searching again with other params of the same query (e.g. the user's position) and after a failure, so
 * the list does not blink; when the limit decreases, the first ones of them show at once. Must run in an injection
 * context.
 * @param params what is searched, or undefined when nothing is for now (e.g. a query too short, results filtered
 * out): nothing is searched then, and the results of the last query, with as many shown, come back once searched
 * again for it with the same number of first results
 * @param search searches the first `limit` results of `params`
 * @param firstResults number of results shown first, 1 to `maxResults` (e.g. fewer in an overview of several searches)
 * @param maxResults most results the API returns, the highest limit it accepts
 */
export function injectPagedSearch<P extends { query: string }, T>(
  params: () => P | undefined,
  search: (params: P, limit: number) => Observable<SearchPage<T>>,
  firstResults: () => number,
  maxResults: number,
): PagedSearchState<T> {
  // Undefined params (nothing searched for now) keep the last query: the same results come back once searched again
  const query = linkedSignal<string | undefined, string | undefined>({
    source: () => params()?.query,
    computation: (searched, previous) => searched ?? previous?.value,
  });
  const limit = linkedSignal({
    source: () => ({ query: query(), first: firstResults() }),
    computation: ({ first }) => first,
  });
  const resource = rxResource({
    params: () => {
      const searched = params();
      return searched ? { searched, limit: limit() } : undefined;
    },
    stream: ({ params: { searched, limit } }) => search(searched, limit),
  });
  const page = linkedSignal<
    {
      /**
       * Last query searched, undefined until one is
       */
      query: string | undefined;

      /**
       * Answer of the resource, undefined while it loads and when it failed
       */
      page: SearchPage<T> | undefined;
    },
    SearchPage<T> | undefined
  >({
    source: () => ({
      query: query(),
      page: resource.hasValue() ? resource.value() : undefined,
    }),
    computation: (source, previous) =>
      source.page ?? (previous?.source.query === source.query ? previous?.value : undefined),
  });

  return {
    results: computed(() => page()?.results.slice(0, limit()) ?? []),
    loading: computed(() => resource.isLoading() && !page()),
    loadingMore: computed(() => resource.isLoading() && !!page()),
    failed: computed(() => resource.status() === 'error'),
    empty: computed(() => page()?.results.length === 0),
    hasMore: computed(() => {
      const shown = page();
      return !!shown && (shown.hasMore || shown.results.length > limit());
    }),
    showMore: () => limit.update((current) => Math.min(current + MORE_RESULTS, maxResults)),
    retry: () => resource.reload(),
  };
}
