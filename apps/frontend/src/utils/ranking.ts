import type { UserRating } from '@/types/rating'

/** A restaurant rated by a user, with the average of all the user's ratings of it. */
export interface RankedRestaurant {
  restaurantId: string
  name: string
  emoji: string
  cuisine: string
  food: number
  service: number
  setting: number
  /** Average of the three criteria */
  overall: number
}

/**
 * Ranks the restaurants a user rated, best first: each restaurant appears once, with the average of the user's
 * ratings of it (a restaurant rated several times is averaged, not counted several times).
 */
export function rankRestaurants(ratings: readonly UserRating[]): RankedRestaurant[] {
  const byRestaurant = new Map<string, UserRating[]>()
  for (const rating of ratings) {
    byRestaurant.set(rating.restaurantId, [
      ...(byRestaurant.get(rating.restaurantId) ?? []),
      rating,
    ])
  }

  return [...byRestaurant.values()]
    .map((restaurantRatings) => {
      const first = restaurantRatings[0]!
      const average = (pick: (r: UserRating) => number) =>
        restaurantRatings.reduce((sum, r) => sum + pick(r), 0) / restaurantRatings.length
      const food = average((r) => r.food)
      const service = average((r) => r.service)
      const setting = average((r) => r.setting)
      return {
        restaurantId: first.restaurantId,
        name: first.restaurantName,
        emoji: first.restaurantEmoji,
        cuisine: first.restaurantCuisine,
        food,
        service,
        setting,
        overall: (food + service + setting) / 3,
      }
    })
    .sort((a, b) => b.overall - a.overall)
}

/**
 * Average score ("overall") the user gave to each restaurant, by restaurant id
 */
export function overallByRestaurant(ratings: readonly UserRating[]): Map<string, number> {
  return new Map(rankRestaurants(ratings).map((r) => [r.restaurantId, r.overall]))
}
