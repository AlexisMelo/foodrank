import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TierlistApi } from '@/core/api/tierlist-api';
import { rankRestaurants } from '@/core/utils/ranking';
import { byLastUpdate } from '@/core/utils/tierlist';
import { injectUserProfile } from '@/shared/data/user-profile';
import { NewReviewChip } from '@/shared/ui/new-review-chip/new-review-chip';
import { RankedRestaurantItem } from '@/shared/ui/ranked-restaurant-item/ranked-restaurant-item';
import { RecentReviewCard } from '@/shared/ui/recent-review-card/recent-review-card';
import { TierlistChip } from '@/shared/ui/tierlist-chip/tierlist-chip';
import { UserBar } from '@/shared/ui/user-bar/user-bar';
import { injectMyRatings } from '../my-ratings';

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
   * Reads the logged-in user's tierlists
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Logged-in user's name, avatar and number of restaurants rated
   */
  protected readonly user = injectUserProfile();

  /**
   * Every rating of the logged-in user, most recent first, from a single GET /api/users/me/ratings shared by the
   * recent reviews and the favorites; the favorites stay hidden when they cannot be loaded
   */
  protected readonly myRatings = injectMyRatings();

  /**
   * Last 5 ratings given by the logged-in user, most recent first
   */
  protected readonly recentRatings = computed(() => this.myRatings.ratings().slice(0, 5));

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
    byLastUpdate(this.tierlists.hasValue() ? this.tierlists.value() : []).slice(0, 8),
  );

  /**
   * The logged-in user's 3 best rated restaurants, by the score of their active rating, as on their profile
   */
  protected readonly topRestaurants = computed(() =>
    rankRestaurants(this.myRatings.ratings()).slice(0, 3),
  );
}
