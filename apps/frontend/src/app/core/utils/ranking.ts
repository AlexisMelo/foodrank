import type { UserRating } from '@/core/models/rating.model';

/**
 * A restaurant rated by a user, with the scores of the user's active (latest) rating of it.
 */
export interface RankedRestaurant {
  /**
   * Id of the restaurant
   */
  restaurantId: string;

  /**
   * Name of the restaurant
   */
  name: string;

  /**
   * Emoji of the restaurant
   */
  emoji: string;

  /**
   * Postal address, shown under the name; empty when unknown
   */
  address: string;

  /**
   * 0 to 100
   */
  food: number;

  /**
   * 0 to 100
   */
  service: number;

  /**
   * Setting (decor), 0 to 100
   */
  setting: number;

  /**
   * Score of the rating: mean of its three criteria
   */
  overall: number;

  /**
   * Moment of the rating, ISO 8601 in UTC (e.g. "2026-03-07T21:30:00+00:00")
   */
  ratedAt: string;
}

/**
 * Order of a list of restaurants: best score first, most recently rated first, or by name
 */
export type RestaurantSort = 'score' | 'recent' | 'az';

/**
 * Sort chips of the lists of restaurants (profile, tierlist, restaurants to add to a tierlist), in display order
 */
export const RESTAURANT_SORT_OPTIONS: readonly { key: RestaurantSort; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'recent', label: 'Recently rated' },
  { key: 'az', label: 'A–Z' },
];

/**
 * Ranks the restaurants a user rated, best first: each restaurant appears once, with the user's active rating of it.
 * The previous ratings of a restaurant are history and do not count.
 */
export function rankRestaurants(ratings: readonly UserRating[]): RankedRestaurant[] {
  return ratings
    .filter((rating) => rating.isActive)
    .map(
      ({
        restaurantId,
        restaurantName,
        restaurantEmoji,
        restaurantAddress,
        date,
        food,
        service,
        setting,
      }) => ({
        restaurantId,
        name: restaurantName,
        emoji: restaurantEmoji,
        address: restaurantAddress,
        food,
        service,
        setting,
        overall: (food + service + setting) / 3,
        ratedAt: date,
      }),
    )
    .sort((a, b) => b.overall - a.overall);
}

/**
 * Copy of `restaurants` in the order `sort`: the best score first, the most recently rated first, or by name. The sort is
 * stable: restaurants with the same score, or rated at the same moment, keep their order.
 */
export function sortRestaurants<T extends RankedRestaurant>(
  restaurants: readonly T[],
  sort: RestaurantSort,
): T[] {
  const sorted = [...restaurants];
  if (sort === 'score') return sorted.sort((a, b) => b.overall - a.overall);
  if (sort === 'recent') {
    return sorted.sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime());
  }
  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Score ("overall") of the user's active rating of each restaurant, by restaurant id
 */
export function overallByRestaurant(ratings: readonly UserRating[]): Map<string, number> {
  return new Map(rankRestaurants(ratings).map((r) => [r.restaurantId, r.overall]));
}

/**
 * Ranks the restaurants of a tierlist by the score its owner gave them (active rating), best first. An owner can only add
 * restaurants they rated to their tierlists, so every restaurant of the tierlist has a score; one without rating
 * (data not created by the app) is skipped rather than shown with a made-up score.
 * @param restaurantIds restaurants of the tierlist
 * @param ownerRatings every rating of the tierlist's owner
 */
export function rankTierlistRestaurants(
  restaurantIds: readonly string[],
  ownerRatings: readonly UserRating[],
): RankedRestaurant[] {
  const inTierlist = new Set(restaurantIds);
  return rankRestaurants(ownerRatings).filter((r) => inTierlist.has(r.restaurantId));
}
