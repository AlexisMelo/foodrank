import type { UserRating } from '@/types/rating'

/** A restaurant rated by a user, with the scores of the user's active (latest) rating of it. */
export interface RankedRestaurant {
  restaurantId: string
  name: string
  emoji: string
  cuisine: string
  food: number
  service: number
  setting: number
  /** Score of the rating: mean of its three criteria */
  overall: number
}

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
        restaurantCuisine,
        food,
        service,
        setting,
      }) => ({
        restaurantId,
        name: restaurantName,
        emoji: restaurantEmoji,
        cuisine: restaurantCuisine,
        food,
        service,
        setting,
        overall: (food + service + setting) / 3,
      }),
    )
    .sort((a, b) => b.overall - a.overall)
}

/**
 * Score ("overall") of the user's active rating of each restaurant, by restaurant id
 */
export function overallByRestaurant(ratings: readonly UserRating[]): Map<string, number> {
  return new Map(rankRestaurants(ratings).map((r) => [r.restaurantId, r.overall]))
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
  const inTierlist = new Set(restaurantIds)
  return rankRestaurants(ownerRatings).filter((r) => inTierlist.has(r.restaurantId))
}
