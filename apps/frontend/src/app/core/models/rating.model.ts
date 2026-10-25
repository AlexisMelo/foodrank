/**
 * Rating sent by the rating page (POST /api/restaurants/:id/ratings), stored in the `rating` table
 * (food_rating, service_rating, setting_rating, bonus).
 */
export interface RatingInput {
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
   * "Instant crush" favorite bonus
   */
  bonus: boolean;
}

/**
 * A rating read from the API (GET /api/restaurants/:id/ratings), with its author.
 * A user rates a restaurant at most once per day: (userId, date) identifies a rating of a restaurant.
 */
export interface RestaurantRating {
  /**
   * Id of the restaurant rated
   */
  restaurantId: string;

  /**
   * Id of the author
   */
  userId: string;

  /**
   * Moment of the rating, ISO 8601 in UTC (e.g. "2026-03-07T21:30:00+00:00"); see `formatRatingDate`
   */
  date: string;

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
   * "Instant crush" favorite bonus
   */
  bonus: boolean;

  /**
   * True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones,
   * kept as history
   */
  isActive: boolean;

  /**
   * Full name or user name of the author, "Anonymous" when unknown
   */
  userName: string;

  /**
   * Profile picture of the author, null when there is none
   */
  userAvatarUrl: string | null;
}

/**
 * Averages of a restaurant's active ratings (each user's latest), from GET /api/restaurants/:id/ratings/summary.
 * The averages are null when nobody rated the restaurant yet.
 */
export interface RatingSummary {
  /**
   * Number of active ratings averaged
   */
  count: number;

  /**
   * 0 to 100
   */
  food: number | null;

  /**
   * 0 to 100
   */
  service: number | null;

  /**
   * Setting (decor), 0 to 100
   */
  setting: number | null;

  /**
   * Average of every criterion of every active rating, 0 to 100 ("instant crush" bonus not included)
   */
  global: number | null;
}

/**
 * Whether the logged-in user can review a restaurant now (GET /api/users/me/rating-allowance). A user reviews at most
 * one restaurant per day (UTC), as they can visit only one restaurant a day.
 */
export interface RatingAllowance {
  /**
   * True when the user has not reviewed any restaurant today (UTC)
   */
  canRate: boolean;

  /**
   * Moment the user can review again, the next midnight UTC, ISO 8601 (e.g. "2026-10-25T00:00:00+00:00"); null when
   * canRate is true
   */
  nextRatingAt: string | null;
}

/**
 * A rating of a user, with the restaurant it rates (GET /api/users/:id/ratings).
 */
export interface UserRating {
  /**
   * Id of the restaurant rated
   */
  restaurantId: string;

  /**
   * Name of the restaurant rated
   */
  restaurantName: string;

  /**
   * Emoji of the restaurant rated
   */
  restaurantEmoji: string;

  /**
   * Postal address of the restaurant rated, empty when unknown
   */
  restaurantAddress: string;

  /**
   * Moment of the rating, ISO 8601 in UTC (e.g. "2026-03-07T21:30:00+00:00"); see `formatRatingDate`
   */
  date: string;

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
   * "Instant crush" favorite bonus
   */
  bonus: boolean;

  /**
   * True for the user's latest rating of the restaurant, which is their score for it; false for the previous ones,
   * kept as history
   */
  isActive: boolean;
}
