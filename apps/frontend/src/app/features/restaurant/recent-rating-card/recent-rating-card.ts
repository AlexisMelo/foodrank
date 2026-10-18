import { Component, computed, input } from '@angular/core';
import type { RestaurantRating } from '@/core/models/rating.model';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';
import { RatingScores } from '@/shared/ui/rating-scores/rating-scores';

/**
 * Card of a recent rating of the restaurant by any user: the author, the day, the "instant crush" bonus, the scores
 * and the average.
 */
@Component({
  imports: [RatingScores],
  selector: 'app-recent-rating-card',
  styleUrl: './recent-rating-card.scss',
  templateUrl: './recent-rating-card.html',
})
export class RecentRatingCard {
  /**
   * Rating shown
   */
  readonly rating = input.required<RestaurantRating>();

  /**
   * Average of the three criteria, rounded, shown in the bubble
   */
  protected readonly average = computed(() => ratingAverage(this.rating()));

  /**
   * Day of the rating, e.g. "March 7, 2026"
   */
  protected readonly displayedDate = computed(() => formatRatingDate(this.rating().date));

  /**
   * Shown instead of the profile picture when the user has none
   */
  protected readonly initial = computed(() => this.rating().userName.charAt(0).toUpperCase());

  /**
   * Color of a 0-100 score
   */
  protected readonly scoreColor = scoreColor;
}
