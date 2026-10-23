import { Location } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import { CriteriaAverages } from '../criteria-averages/criteria-averages';
import { CelebrationDialog } from '../celebration-dialog/celebration-dialog';
import { CuisineChip } from '../cuisine-chip/cuisine-chip';
import { GlobalScoreBadge } from '../global-score-badge/global-score-badge';
import { RestaurantAddress } from '../restaurant-address/restaurant-address';
import { RestaurantRatingsTabs } from '../restaurant-ratings-tabs/restaurant-ratings-tabs';
import { injectRestaurantRatings } from '../restaurant-ratings';

/**
 * Restaurant page (/restaurant/:id): the restaurant, its global rating and criteria averages, and its ratings. A full
 * page modal celebrates the user when they are the first to open the place from the search ("The explorer"), and
 * right after their first rating of the restaurant ("Bravo").
 */
@Component({
  imports: [
    CriteriaAverages,
    CelebrationDialog,
    CuisineChip,
    GlobalScoreBadge,
    RestaurantAddress,
    RestaurantRatingsTabs,
  ],
  selector: 'app-restaurant-detail',
  styleUrl: './restaurant-detail.scss',
  templateUrl: './restaurant-detail.html',
})
export class RestaurantDetail {
  /**
   * Database id of the restaurant, from /restaurant/:id
   */
  readonly id = input.required<string>();

  /**
   * Leaves an unknown restaurant for the home page
   */
  private readonly router = inject(Router);

  /**
   * Goes back to the previous page from the error message
   */
  private readonly location = inject(Location);

  /**
   * Reads the restaurant
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * The restaurant of the route, reloaded each time the id changes; undefined when it does not exist, the page then
   * leaves for the home page
   */
  private readonly restaurantResource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) =>
      this.restaurantApi.fetchRestaurantById(id).pipe(
        tap((found) => {
          if (!found) void this.router.navigateByUrl('/', { replaceUrl: true });
        }),
      ),
  });

  /**
   * True while the restaurant loads
   */
  protected readonly loading = this.restaurantResource.isLoading;

  /**
   * True when the restaurant could not be loaded (e.g. API unavailable)
   */
  protected readonly loadError = computed(() => this.restaurantResource.status() === 'error');

  /**
   * The restaurant shown; undefined while loading, on error and when it does not exist
   */
  protected readonly restaurant = computed(() =>
    this.restaurantResource.hasValue() ? this.restaurantResource.value() : undefined,
  );

  /**
   * Celebration handed by the search or the rating page, read each time the restaurant changes: opening another
   * restaurant from the search keeps this page, only its id changes
   */
  private readonly celebrations = inject(CelebrationStore);

  /**
   * What the modal celebrates, once the restaurant is loaded and is the one celebrated; null when no modal shows
   */
  protected readonly celebration = computed(() => {
    const celebration = this.celebrations.pending();
    return celebration && celebration.restaurantId === this.restaurant()?.id
      ? celebration.kind
      : null;
  });

  /**
   * Loaded once the restaurant is known, and again each time this page is opened (e.g. right after rating it)
   */
  protected readonly ratings = injectRestaurantRatings(() => this.restaurant()?.id ?? null);

  /**
   * Removes the celebration modal once closed, for good
   */
  protected closeCelebration(): void {
    this.celebrations.dismiss();
  }

  /**
   * Goes back to the previous page
   */
  protected goBack(): void {
    this.location.back();
  }
}
