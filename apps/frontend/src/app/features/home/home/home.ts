import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RatingApi } from '@/core/api/rating-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { rankRestaurants } from '@/core/utils/ranking';
import { injectUserProfile } from '@/shared/data/user-profile';
import { NewReviewChip } from '@/shared/ui/new-review-chip/new-review-chip';
import { RankedRestaurantItem } from '@/shared/ui/ranked-restaurant-item/ranked-restaurant-item';
import { TierlistChip } from '@/shared/ui/tierlist-chip/tierlist-chip';
import { UserBar } from '@/shared/ui/user-bar/user-bar';
import { injectMyRecentRatings } from '../my-recent-ratings';
import { RecentReviewCard } from '../recent-review-card/recent-review-card';

/**
 * Home page (/): the logged-in user, their recent reviews, their latest tierlists and their favorite restaurants.
 */
@Component({
  imports: [
    RouterLink,
    NewReviewChip,
    RankedRestaurantItem,
    RecentReviewCard,
    TierlistChip,
    UserBar,
  ],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  /**
   * Opens the settings page
   */
  private readonly router = inject(Router);

  /**
   * Reads the logged-in user's ratings, which rank the favorites
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Reads the logged-in user's tierlists
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Logged-in user's name, avatar and number of restaurants rated
   */
  protected readonly user = injectUserProfile();

  /**
   * Last 5 ratings given by the logged-in user
   */
  protected readonly recentRatings = injectMyRecentRatings(5);

  /**
   * Every rating of the logged-in user; the favorites stay hidden when they cannot be loaded
   */
  private readonly myRatings = rxResource({
    stream: () => this.ratingApi.fetchUserRatings(),
  });

  /**
   * The logged-in user's tierlists; the section stays hidden when they cannot be loaded, the rest of the home page
   * still works
   */
  private readonly tierlists = rxResource({
    stream: () => this.tierlistApi.fetchTierlistsByUserId(),
  });

  /**
   * The logged-in user's 8 most recently updated tierlists
   */
  protected readonly recentTierlists = computed(() =>
    [...(this.tierlists.hasValue() ? this.tierlists.value() : [])]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8),
  );

  /**
   * The logged-in user's 3 best rated restaurants, by the score of their active rating, as on their profile
   */
  protected readonly topRestaurants = computed(() =>
    rankRestaurants(this.myRatings.hasValue() ? this.myRatings.value() : []).slice(0, 3),
  );

  /**
   * Opens the settings page
   */
  protected openSettings(): void {
    void this.router.navigateByUrl('/settings');
  }
}
