import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RestaurantRating } from '@/core/models/rating.model';
import { formatRatingDate, ratingAverage, scoreColor } from '@/core/utils/rating';
import { ScorePipe } from '@/shared/pipes/score-pipe';
import { RatingScores } from '@/shared/ui/rating-scores/rating-scores';

/**
 * Card of a rating of the restaurant, in every tab of its ratings (the logged-in user's, the recent ones of every user,
 * the users followed): the author, the day, the "instant crush" bonus, the scores and the average. Opens the author's
 * profile. A previous rating, replaced by a more recent one, is dimmed.
 */
@Component({
  imports: [RouterLink, RatingScores, ScorePipe],
  selector: 'app-rating-card',
  styleUrl: './rating-card.scss',
  templateUrl: './rating-card.html',
})
export class RatingCard {
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
   * Average of the three criteria, rounded to one decimal, shown in the bubble
   */
  protected readonly average = computed(() => ratingAverage(this.rating()));

  /**
   * Color of the bubble of the average
   */
  protected readonly averageColor = computed(() => scoreColor(this.average()));

  /**
   * Day of the rating, e.g. "March 7, 2026"
   */
  protected readonly displayedDate = computed(() => formatRatingDate(this.rating().date));

  /**
   * Shown instead of the profile picture when the user has none
   */
  protected readonly initial = computed(() => this.rating().userName.charAt(0).toUpperCase());
}
