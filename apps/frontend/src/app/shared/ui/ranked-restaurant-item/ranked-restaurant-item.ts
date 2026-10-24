import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DailyReviewStore, REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { scoreColor } from '@/core/utils/rating';
import { LockIcon } from '../lock-icon/lock-icon';
import { RatingScores } from '../rating-scores/rating-scores';

/**
 * Background of the item at `index` in the ranking: white for the first, then fading grays, then the card color
 */
function itemBackground(index: number): string {
  if (index === 0) return '#ffffff';
  if (index === 1) return 'rgba(255,255,255,0.14)';
  if (index === 2) return 'rgba(255,255,255,0.07)';
  return '#1a1a1a';
}

/**
 * A restaurant of a ranking (favorites, profile, tierlist): its criteria scores, its overall score and, optionally,
 * the logged-in user's own score or a link to rate it (a padlock instead once they reviewed a restaurant today). Opens
 * the restaurant page.
 */
@Component({
  imports: [LockIcon, RouterLink, RatingScores],
  selector: 'app-ranked-restaurant-item',
  styleUrl: './ranked-restaurant-item.scss',
  templateUrl: './ranked-restaurant-item.html',
})
export class RankedRestaurantItem {
  /**
   * Database id of the restaurant, used in /restaurant/:id
   */
  readonly restaurantId = input.required<string>();

  /**
   * Emoji of the restaurant
   */
  readonly emoji = input.required<string>();

  /**
   * Name of the restaurant
   */
  readonly name = input.required<string>();

  /**
   * Type of cuisine, shown under the name; empty when unknown
   */
  readonly cuisine = input.required<string>();

  /**
   * Food score, 0 to 100, decimals allowed
   */
  readonly food = input.required<number>();

  /**
   * Service score, 0 to 100, decimals allowed
   */
  readonly service = input.required<number>();

  /**
   * Decor (setting) score, 0 to 100, decimals allowed
   */
  readonly decor = input.required<number>();

  /**
   * Overall score, 0 to 100, decimals allowed; shown rounded in the colored bubble
   */
  readonly overall = input.required<number>();

  /**
   * Position in the ranking, from 0: the first three items stand out
   */
  readonly index = input.required<number>();

  /**
   * The logged-in user's own score, 0 to 100, shown in a small bubble; undefined when they did not rate it
   */
  readonly myScore = input<number>();

  /**
   * Route of the rating page, linked from a "+" bubble next to the restaurant link when there is no myScore;
   * undefined for no bubble. The bubble shows a padlock instead, not linked, once the user reviewed a restaurant today
   */
  readonly rateLink = input<string>();

  /**
   * Locks the "+" bubble once the user reviewed a restaurant today
   */
  protected readonly dailyReview = inject(DailyReviewStore);

  /**
   * Tooltip of the locked bubble
   */
  protected readonly lockedReason = REVIEW_LOCKED_REASON;

  /**
   * Background of the item, also exposed as --item-bg to its children
   */
  protected readonly background = computed(() => itemBackground(this.index()));

  /**
   * Overall score rounded, shown in the bubble
   */
  protected readonly roundedOverall = computed(() => Math.round(this.overall()));

  /**
   * The user's score rounded; only shown when myScore is defined
   */
  protected readonly roundedMyScore = computed(() => Math.round(this.myScore() ?? 0));

  /**
   * Color of a rounded 0-100 score
   */
  protected readonly scoreColor = scoreColor;
}
