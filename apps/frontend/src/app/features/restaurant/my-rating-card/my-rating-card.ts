import { Component, computed, input } from '@angular/core';
import type { RestaurantRating } from '@/core/models/rating.model';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';

/**
 * Card of a rating the logged-in user gave to the restaurant: the day, the "instant crush" bonus, the average and a
 * bar per criterion. A previous rating, replaced by a more recent one, is dimmed.
 */
@Component({
  imports: [],
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
   * Average of the three criteria, rounded, shown in the bubble
   */
  protected readonly average = computed(() => ratingAverage(this.rating()));

  /**
   * Day of the rating, e.g. "March 7, 2026"
   */
  protected readonly displayedDate = computed(() => formatRatingDate(this.rating().date));

  /**
   * One entry per criterion, in display order: its label and its rounded score
   */
  protected readonly criteria = computed(() => {
    const rating = this.rating();
    return [
      { label: '🍽️ Food', score: Math.round(rating.food) },
      { label: '🤝 Service', score: Math.round(rating.service) },
      { label: '✨ Decor', score: Math.round(rating.setting) },
    ];
  });

  /**
   * Color of a 0-100 score
   */
  protected readonly scoreColor = scoreColor;
}
