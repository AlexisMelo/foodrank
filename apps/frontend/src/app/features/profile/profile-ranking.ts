import { Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { ME } from '@/core/api/user-api';
import { type RankedRestaurant, overallByRestaurant, rankRestaurants } from '@/core/utils/ranking';

/**
 * A restaurant of a profile ranking, with the logged-in user's own score of it.
 */
export interface ProfileRankedRestaurant extends RankedRestaurant {
  /**
   * Score ("overall", 0 to 100) of the logged-in user's active rating of the restaurant; undefined on their own
   * profile, and when they never rated it
   */
  myScore: number | undefined;
}

/**
 * Ranking of a profile being loaded by injectProfileRanking, as read-only signals.
 */
export interface ProfileRankingState {
  /**
   * Restaurants rated by the user, best first, each listed once; empty while loading and when the API fails
   */
  rankedRestaurants: Signal<ProfileRankedRestaurant[]>;

  /**
   * True on the logged-in user's own profile
   */
  isOwnProfile: Signal<boolean>;

  /**
   * True while the ratings load, including after a change of user
   */
  loading: Signal<boolean>;

  /**
   * True when the API failed
   */
  loadError: Signal<boolean>;
}

/**
 * Restaurants rated by a user, best first, as shown on a profile page, loaded from the API by an rxResource of the
 * calling page. On another user's profile, each restaurant also carries the logged-in user's own score ("myScore"),
 * undefined when the logged-in user never rated it. Reloaded each time the id changes, and a late answer for a
 * previous id is ignored. Must run in an injection context.
 * @param userId id of the user, "me" (default) for the logged-in user
 */
export function injectProfileRanking(userId: () => string = () => ME): ProfileRankingState {
  const api = inject(RatingApi);
  const resource = rxResource({
    params: userId,
    stream: ({ params: id }) =>
      forkJoin({
        ratings: api.fetchUserRatings(id),
        // Only loaded on another user's profile
        mine: id === ME ? of([]) : api.fetchUserRatings(ME),
      }),
  });

  const isOwnProfile = computed(() => userId() === ME);

  return {
    rankedRestaurants: computed(() => {
      const { ratings, mine } = resource.hasValue() ? resource.value() : { ratings: [], mine: [] };
      const myScores = overallByRestaurant(mine);
      return rankRestaurants(ratings).map((restaurant) => ({
        ...restaurant,
        myScore: isOwnProfile() ? undefined : myScores.get(restaurant.restaurantId),
      }));
    }),
    isOwnProfile,
    loading: resource.isLoading,
    loadError: computed(() => resource.status() === 'error'),
  };
}
