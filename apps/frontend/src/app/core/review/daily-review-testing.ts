import type { RatingAllowance } from '@/core/models/rating.model';

// Test helpers shared by the specs of the pages showing a review button

/**
 * Answer of GET /api/users/me/rating-allowance for a user who did not review any restaurant today
 */
export const CAN_REVIEW: RatingAllowance = { canRate: true, nextRatingAt: null };

/**
 * Answer of GET /api/users/me/rating-allowance for a user who already reviewed a restaurant today, allowed again in an
 * hour: a moment in the future, so the review buttons stay locked during the test
 */
export function alreadyReviewed(): RatingAllowance {
  return { canRate: false, nextRatingAt: new Date(Date.now() + 3_600_000).toISOString() };
}
