import { Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import type { RatingSummary, RestaurantRating } from '@/core/models/rating.model';

/**
 * Number of ratings shown in the "Recent" tab.
 */
export const RECENT_RATINGS_COUNT = 5;

/**
 * Ratings of a restaurant being loaded by injectRestaurantRatings, as read-only signals.
 */
export interface RestaurantRatingsState {
  /**
   * Most recent active ratings (each user's latest), every user included, most recent first; empty while loading,
   * when the restaurant is unknown and when the API fails
   */
  recentRatings: Signal<RestaurantRating[]>;

  /**
   * Every rating of the logged-in user, most recent first; empty while loading, when the restaurant is unknown and
   * when the API fails
   */
  myRatings: Signal<RestaurantRating[]>;

  /**
   * Averages of every active rating; null until loaded, when the restaurant is unknown and when the API fails
   */
  summary: Signal<RatingSummary | null>;

  /**
   * True while the ratings load, including after a change of restaurant
   */
  loading: Signal<boolean>;

  /**
   * True when one of the three requests failed
   */
  loadError: Signal<boolean>;
}

/**
 * Ratings displayed on a restaurant page: the most recent ones (every user), all of the logged-in user's, and the
 * averages of every active rating, loaded from the API by an rxResource of the calling page.
 * Reloaded each time the restaurant id changes, so a rating saved just before opening the page is shown, and a late
 * answer for a previous restaurant is ignored. State is per call (not shared between pages). Must run in an injection
 * context.
 * @param restaurantId nothing is loaded while it returns null
 */
export function injectRestaurantRatings(restaurantId: () => string | null): RestaurantRatingsState {
  const api = inject(RatingApi);
  const resource = rxResource({
    // undefined leaves the resource idle: nothing is loaded
    params: () => restaurantId() ?? undefined,
    stream: ({ params: id }) =>
      forkJoin({
        recent: api.fetchRecentRatings(id, RECENT_RATINGS_COUNT),
        mine: api.fetchMyRatings(id),
        summary: api.fetchRatingSummary(id),
      }),
  });

  /**
   * The three answers, undefined until they are all loaded
   */
  const loaded = computed(() => (resource.hasValue() ? resource.value() : undefined));

  return {
    recentRatings: computed(() => loaded()?.recent ?? []),
    myRatings: computed(() => loaded()?.mine ?? []),
    summary: computed(() => loaded()?.summary ?? null),
    loading: resource.isLoading,
    loadError: computed(() => resource.status() === 'error'),
  };
}
