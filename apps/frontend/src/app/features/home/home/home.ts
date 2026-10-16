import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { AuthStore } from '@/core/auth/auth-store';
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
   * Gives the id of the user in the community mock data (hardcoded "alex", not the logged-in user)
   */
  private readonly auth = inject(AuthStore);

  /**
   * Reads the community visits (mock data)
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Reads the restaurants of the favorites
   */
  private readonly restaurantApi = inject(RestaurantApi);

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
   * Community visits of the current user (mock data) and every restaurant, loaded together; the favorites stay
   * hidden when it fails
   */
  private readonly favoritesData = rxResource({
    stream: () =>
      forkJoin({
        visits: this.ratingApi.fetchCommunityVisitsByUserId(this.auth.currentUserId),
        restaurants: this.restaurantApi.fetchRestaurants(),
      }),
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
   * The 3 visited restaurants with the best average of the user's visits, with their criteria averages (0 to 100)
   */
  protected readonly topRestaurants = computed(() => {
    const { visits, restaurants } = this.favoritesData.hasValue()
      ? this.favoritesData.value()
      : { visits: [], restaurants: [] };
    const visitedIds = new Set(visits.map((v) => v.restaurantId));
    return [...restaurants]
      .filter((r) => visitedIds.has(r.id))
      .map((r) => {
        const restaurantVisits = visits.filter((v) => v.restaurantId === r.id);
        const food = restaurantVisits.reduce((s, v) => s + v.food, 0) / restaurantVisits.length;
        const service =
          restaurantVisits.reduce((s, v) => s + v.service, 0) / restaurantVisits.length;
        const decor = restaurantVisits.reduce((s, v) => s + v.decor, 0) / restaurantVisits.length;
        return { ...r, scores: { food, service, decor, overall: (food + service + decor) / 3 } };
      })
      .sort((a, b) => b.scores.overall - a.scores.overall)
      .slice(0, 3);
  });

  /**
   * Opens the settings page
   */
  protected openSettings(): void {
    void this.router.navigateByUrl('/settings');
  }
}
