import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatRatingDate, scoreColor } from '@/core/utils/rating';

/**
 * Card of a rating given by the logged-in user: the restaurant, the day, the average and a bar per criterion. Opens
 * the restaurant page.
 */
@Component({
  imports: [RouterLink],
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
   * Food score, 0 to 100
   */
  readonly food = input.required<number>();

  /**
   * Service score, 0 to 100
   */
  readonly service = input.required<number>();

  /**
   * Decor (setting) score, 0 to 100
   */
  readonly decor = input.required<number>();

  /**
   * False for a previous rating, replaced by a more recent one of the same restaurant: shown dimmed
   */
  readonly active = input.required<boolean>();

  /**
   * Average of the three criteria, rounded, shown in the bubble
   */
  protected readonly average = computed(() =>
    Math.round((this.food() + this.service() + this.decor()) / 3),
  );

  /**
   * Day of the rating, e.g. "Oct 8"
   */
  protected readonly displayedDate = computed(() =>
    formatRatingDate(this.date(), { month: 'short', day: 'numeric' }),
  );

  /**
   * One entry per criterion, in display order: its emoji and its score
   */
  protected readonly criteria = computed(() => [
    { label: '🍽️', score: this.food() },
    { label: '🤝', score: this.service() },
    { label: '✨', score: this.decor() },
  ]);

  /**
   * Color of a 0-100 score
   */
  protected readonly scoreColor = scoreColor;
}
