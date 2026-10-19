import { Location } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, of, tap } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import type { Restaurant } from '@/core/models/restaurant.model';
import { CriteriaAverages } from '../criteria-averages/criteria-averages';
import { CuisineChip } from '../cuisine-chip/cuisine-chip';
import { GlobalScoreBadge } from '../global-score-badge/global-score-badge';
import { RestaurantAddress } from '../restaurant-address/restaurant-address';
import { RestaurantRatingsTabs } from '../restaurant-ratings-tabs/restaurant-ratings-tabs';
import { injectRestaurantRatings } from '../restaurant-ratings';

/**
 * Restaurant page (/restaurant/:id, /restaurant/place/:placeId): the restaurant, its global rating and criteria
 * averages, and its ratings.
 */
@Component({
  imports: [
    CriteriaAverages,
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
   * Database id of the restaurant, from /restaurant/:id; undefined on /restaurant/place/:placeId
   */
  readonly id = input<string>();

  /**
   * Id of the place at the place provider, from /restaurant/place/:placeId (opened from the search); undefined on
   * /restaurant/:id
   */
  readonly placeId = input<string>();

  /**
   * Replaces the URL once the restaurant of a place is known, or leaves an unknown restaurant
   */
  private readonly router = inject(Router);

  /**
   * Goes back to the previous page from the error message
   */
  private readonly location = inject(Location);

  /**
   * Reads the restaurant, or gets or creates the one of a place
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * The restaurant of the route, reloaded each time the route params change; undefined when it does not exist
   */
  private readonly restaurantResource = rxResource({
    params: () => ({ id: this.id(), placeId: this.placeId() }),
    stream: ({ params: { id, placeId } }) => this.loadRestaurant(id, placeId),
  });

  /**
   * True while the restaurant loads
   */
  protected readonly loading = this.restaurantResource.isLoading;

  /**
   * True when the restaurant could not be loaded (e.g. place provider unavailable)
   */
  protected readonly loadError = computed(() => this.restaurantResource.status() === 'error');

  /**
   * The restaurant shown; undefined while loading, on error and when it does not exist
   */
  protected readonly restaurant = computed(() =>
    this.restaurantResource.hasValue() ? this.restaurantResource.value() : undefined,
  );

  /**
   * Loaded once the restaurant is known, and again each time this page is opened (e.g. right after rating it)
   */
  protected readonly ratings = injectRestaurantRatings(() => this.restaurant()?.id ?? null);

  /**
   * Loads the restaurant from the route:
   * - /restaurant/place/:placeId (opened from the search): gets or creates it in the database,
   *   then replaces the URL with its stable /restaurant/:id
   * - /restaurant/:id: reads it from the database, and leaves for the home page when it does not exist
   */
  private loadRestaurant(id?: string, placeId?: string): Observable<Restaurant | undefined> {
    const found$: Observable<Restaurant | undefined> = placeId
      ? this.restaurantApi.createRestaurantFromPlace(placeId).pipe(
          tap((found) => {
            void this.router.navigateByUrl(`/restaurant/${found.id}`, { replaceUrl: true });
          }),
        )
      : id
        ? this.restaurantApi.fetchRestaurantById(id)
        : of(undefined);
    return found$.pipe(
      tap((found) => {
        if (!found) void this.router.navigateByUrl('/', { replaceUrl: true });
      }),
    );
  }

  /**
   * Goes back to the previous page
   */
  protected goBack(): void {
    this.location.back();
  }
}
