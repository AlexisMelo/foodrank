import { Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { ME } from '@/core/api/user-api';
import type { UserRating } from '@/core/models/rating.model';

/**
 * Last ratings of the logged-in user being loaded by injectMyRecentRatings, as read-only signals.
 */
export interface MyRecentRatingsState {
  /**
   * Ratings kept, most recent first; empty while loading and when the API fails
   */
  ratings: Signal<UserRating[]>;

  /**
   * True while the ratings load
   */
  loading: Signal<boolean>;

  /**
   * True when the API failed
   */
  loadError: Signal<boolean>;
}

/**
 * Last ratings given by the logged-in user, most recent first, loaded from the API by an rxResource of the calling
 * page. State is per call so each page shows fresh data (e.g. right after a new rating). Must run in an injection
 * context.
 * @param limit number of ratings kept
 */
export function injectMyRecentRatings(limit = 5): MyRecentRatingsState {
  const api = inject(RatingApi);
  const resource = rxResource({
    stream: () => api.fetchUserRatings(ME).pipe(map((ratings) => ratings.slice(0, limit))),
  });

  return {
    ratings: computed(() => (resource.hasValue() ? resource.value() : [])),
    loading: resource.isLoading,
    loadError: computed(() => resource.status() === 'error'),
  };
}
