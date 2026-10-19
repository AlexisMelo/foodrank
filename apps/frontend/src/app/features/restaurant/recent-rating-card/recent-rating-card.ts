import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RestaurantRating } from '@/core/models/rating.model';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';
import { RatingScores } from '@/shared/ui/rating-scores/rating-scores';

/**
 * Card of a recent rating of the restaurant by any user: the author, the day, the "instant crush" bonus, the scores
 * and the average. Opens the author's profile.
 */
@Component({
  imports: [RouterLink, RatingScores],
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
   * True when the logged-in user wrote the rating: the card opens their own profile (/profile) instead of /user/:id
   */
  readonly own = input(false);

  /**
   * Profile of the author, opened by a click on the card
   */
  protected readonly profileLink = computed(() =>
    this.own() ? '/profile' : ['/user', this.rating().userId],
  );

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
