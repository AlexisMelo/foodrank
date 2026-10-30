import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';
import { ScorePipe } from '@/shared/pipes/score-pipe';
import { RatingScores } from '../rating-scores/rating-scores';

/**
 * Card of a rating, given by the logged-in user (home page) or by a user they follow (community page): the restaurant,
 * the day, the average and the score of each criterion under its emoji. Opens the restaurant page.
 */
@Component({
  imports: [RatingScores, RouterLink, ScorePipe],
  selector: 'app-recent-review-card',
  styleUrl: './recent-review-card.scss',
  templateUrl: './recent-review-card.html',
})
export class RecentReviewCard {
  /**
   * Database id of the restaurant rated, used in /restaurant/:id
   */
  readonly restaurantId = input.required<string>();

  /**
   * Emoji of the restaurant
   */
  readonly emoji = input.required<string>();

  /**
   * Name of the restaurant, cut after 2 lines
   */
  readonly name = input.required<string>();

  /**
   * Day of the rating, "yyyy-MM-dd"
   */
  readonly date = input.required<string>();

  /**
   * Food score, whole number from 1 to 10
   */
  readonly food = input.required<number>();

  /**
   * Service score, whole number from 1 to 10
   */
  readonly service = input.required<number>();

  /**
   * Decor (setting) score, whole number from 1 to 10
   */
  readonly decor = input.required<number>();

  /**
   * False for a previous rating, replaced by a more recent one of the same restaurant: shown dimmed
   */
  readonly active = input.required<boolean>();

  /**
   * Average of the three criteria, rounded to one decimal, shown in the bubble
   */
  protected readonly average = computed(() =>
    ratingAverage({ food: this.food(), service: this.service(), setting: this.decor() }),
  );

  /**
   * Day of the rating, e.g. "Oct 8"
   */
  protected readonly displayedDate = computed(() =>
    formatRatingDate(this.date(), { month: 'short', day: 'numeric' }),
  );

  /**
   * Color of a 1-10 score
   */
  protected readonly scoreColor = scoreColor;
}
