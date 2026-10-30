import { Component, computed, input } from '@angular/core';
import type { RestaurantRating } from '@/core/models/rating.model';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';
import { ScorePipe } from '@/shared/pipes/score-pipe';
import { RatingScores } from '@/shared/ui/rating-scores/rating-scores';

/**
 * Card of a rating the logged-in user gave to the restaurant, laid out like the cards of the "Recent" tab
 * (RecentRatingCard): the day, the "instant crush" bonus, the score of each criterion under its emoji and the average.
 * A previous rating, replaced by a more recent one, is dimmed.
 */
@Component({
  imports: [RatingScores, ScorePipe],
  selector: 'app-my-rating-card',
  styleUrl: './my-rating-card.scss',
  templateUrl: './my-rating-card.html',
})
export class MyRatingCard {
  /**
   * Rating shown
   */
  readonly rating = input.required<RestaurantRating>();

  /**
   * Average of the three criteria, rounded to one decimal, shown in the bubble
   */
  protected readonly average = computed(() => ratingAverage(this.rating()));

  /**
   * Day of the rating, e.g. "March 7, 2026"
   */
  protected readonly displayedDate = computed(() => formatRatingDate(this.rating().date));

  /**
   * Color of a 1-10 score
   */
  protected readonly scoreColor = scoreColor;
}
