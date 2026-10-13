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

/**
 * Averages of a restaurant's active ratings (each user's latest), from GET /api/restaurants/:id/ratings/summary.
 * The averages are null when nobody rated the restaurant yet.
 */
export interface RatingSummary {
  /** Number of active ratings averaged */
  count: number
  /** 0 to 100 */
  food: number | null
  /** 0 to 100 */
  service: number | null
  /** Setting (decor), 0 to 100 */
  setting: number | null
  /** Average of every criterion of every active rating, 0 to 100 ("instant crush" bonus not included) */
  global: number | null
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
