import { Component, computed, inject, input, signal } from '@angular/core';
import { AuthStore } from '@/core/auth/auth-store';
import type { RestaurantRating } from '@/core/models/rating.model';
import { NewReviewChip } from '@/shared/ui/new-review-chip/new-review-chip';
import { RatingCard } from '../rating-card/rating-card';

/**
 * Tab of the ratings: the logged-in user's, the recent ones of every user, or the recent ones of the users followed.
 */
type RatingsTab = 'mine' | 'recent' | 'followed';

/**
 * Shown in each tab when it has no rating.
 */
const EMPTY_MESSAGES: Record<RatingsTab, string> = {
  mine: 'No visits yet 🍽️',
  recent: 'No recent visits 🍽️',
  followed: 'Nobody you follow ate here yet 🍽️',
};

/**
 * Ratings of a restaurant in three tabs: the logged-in user's ("My Visits", shown first), the most recent of every user
 * ("Recent") and the most recent of the users followed ("Followed"), with the "+ New" button rating the restaurant.
 */
@Component({
  imports: [NewReviewChip, RatingCard],
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
   * Most recent active ratings of the restaurant by the users the logged-in user follows, most recent first
   */
  readonly followedRatings = input.required<readonly RestaurantRating[]>();

  /**
   * True while the ratings load: shown instead of an empty list
   */
  readonly loading = input.required<boolean>();

  /**
   * True when the ratings could not be loaded
   */
  readonly loadError = input.required<boolean>();

  /**
   * Tab shown
   */
  protected readonly activeTab = signal<RatingsTab>('mine');

  /**
   * Ratings of the tab shown
   */
  protected readonly ratings = computed(() => {
    switch (this.activeTab()) {
      case 'mine':
        return this.myRatings();
      case 'recent':
        return this.recentRatings();
      case 'followed':
        return this.followedRatings();
    }
  });

  /**
   * Id of the logged-in user, which tells their own ratings apart (they open /profile); null when logged out
   */
  protected readonly myUserId = inject(AuthStore).loggedInUserId;

  /**
   * Shown when the tab has no rating
   */
  protected readonly emptyMessage = computed(() => EMPTY_MESSAGES[this.activeTab()]);

  /**
   * Identifies a rating in the list: a user rates a restaurant at most once per day
   */
  protected ratingKey(rating: RestaurantRating): string {
    return `${rating.userId}-${rating.date}`;
  }
}
