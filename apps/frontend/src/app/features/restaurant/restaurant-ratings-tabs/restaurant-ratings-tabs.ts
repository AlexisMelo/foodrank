import { Component, computed, input, signal } from '@angular/core';
import type { RestaurantRating } from '@/core/models/rating.model';
import { NewReviewChip } from '@/shared/ui/new-review-chip/new-review-chip';
import { MyRatingCard } from '../my-rating-card/my-rating-card';
import { RecentRatingCard } from '../recent-rating-card/recent-rating-card';

/**
 * Ratings of a restaurant in two tabs: the logged-in user's ("My Visits", shown first) and the most recent of every
 * user ("Recent"), with the "+ New" button rating the restaurant.
 */
@Component({
  imports: [MyRatingCard, NewReviewChip, RecentRatingCard],
  selector: 'app-restaurant-ratings-tabs',
  styleUrl: './restaurant-ratings-tabs.scss',
  templateUrl: './restaurant-ratings-tabs.html',
})
export class RestaurantRatingsTabs {
  /**
   * Database id of the restaurant, rated by the "+ New" button
   */
  readonly restaurantId = input.required<string>();

  /**
   * Every rating the logged-in user gave to the restaurant, most recent first
   */
  readonly myRatings = input.required<readonly RestaurantRating[]>();

  /**
   * Most recent active ratings of the restaurant, every user included, most recent first
   */
  readonly recentRatings = input.required<readonly RestaurantRating[]>();

  /**
   * True while the ratings load: shown instead of an empty list
   */
  readonly loading = input.required<boolean>();

  /**
   * True when the ratings could not be loaded
   */
  readonly loadError = input.required<boolean>();

  /**
   * Tab shown: the logged-in user's ratings or the recent ratings of every user
   */
  protected readonly activeTab = signal<'mine' | 'recent'>('mine');

  /**
   * Ratings of the tab shown
   */
  protected readonly ratings = computed(() =>
    this.activeTab() === 'mine' ? this.myRatings() : this.recentRatings(),
  );

  /**
   * Id of the logged-in user, read from their own ratings; undefined when they never rated the restaurant, so none of
   * the recent ratings is theirs
   */
  protected readonly myUserId = computed(() => this.myRatings()[0]?.userId);

  /**
   * Shown when the tab has no rating
   */
  protected readonly emptyMessage = computed(() =>
    this.activeTab() === 'mine' ? 'No visits yet 🍽️' : 'No recent visits 🍽️',
  );

  /**
   * Identifies a rating in the list: a user rates a restaurant at most once per day
   */
  protected ratingKey(rating: RestaurantRating): string {
    return `${rating.userId}-${rating.date}`;
  }
}
