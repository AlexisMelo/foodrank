export interface Visit {
  id: string
  restaurantId: string
  date: string
  food: number
  service: number
  decor: number
}

export interface CommunityVisit extends Visit {
  user: {
    id: string
    name: string
    avatar: string
  }
}

/**
 * Rating sent by the rating page (POST /api/restaurants/:id/ratings), stored in the `rating` table
 * (food_rating, service_rating, setting_rating, bonus: see database.types.ts).
 */
export interface RatingInput {
  /** 0 to 100 */
  food: number
  /** 0 to 100 */
  service: number
  /** Setting (decor), 0 to 100 */
  setting: number
  /** "Instant crush" favorite bonus */
  bonus: boolean
}

/**
 * A rating read from the API (GET /api/restaurants/:id/ratings), with its author.
 * A user rates a restaurant at most once per day: (userId, date) identifies a rating of a restaurant.
 */
export interface RestaurantRating {
  restaurantId: string
  userId: string
  /** Day of the rating, "yyyy-MM-dd" (no time, no time zone) */
  date: string
  /** 0 to 100 */
  food: number
  /** 0 to 100 */
  service: number
  /** Setting (decor), 0 to 100 */
  setting: number
  /** "Instant crush" favorite bonus */
  bonus: boolean
  /**
   * True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones,
   * kept as history
   */
  isActive: boolean
  /** Full name or user name of the author, "Anonymous" when unknown */
  userName: string
  /** Profile picture of the author, null when there is none */
  userAvatarUrl: string | null
}

/** A rating of a user, with the restaurant it rates (GET /api/users/:id/ratings). */
export interface UserRating {
  restaurantId: string
  restaurantName: string
  restaurantEmoji: string
  /** Empty when unknown */
  restaurantCuisine: string
  /** Day of the rating, "yyyy-MM-dd" */
  date: string
  /** 0 to 100 */
  food: number
  /** 0 to 100 */
  service: number
  /** Setting (decor), 0 to 100 */
  setting: number
  bonus: boolean
  /**
   * True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones,
   * kept as history
   */
  isActive: boolean
}
