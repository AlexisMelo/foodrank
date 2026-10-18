import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { AuthStore } from '@/core/auth/auth-store';
import { UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import type { Restaurant } from '@/core/models/restaurant.model';

/**
 * Number of restaurants suggested.
 */
const SUGGESTION_COUNT = 5;

/**
 * A restaurant suggested, with its distance from the user.
 */
interface RestaurantWithDistance extends Restaurant {
  /**
   * Distance from the user in kilometers; null when the user's position is unknown
   */
  distance: number | null;
}

/**
 * Great-circle distance between two points, in kilometers.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * A distance for display: "850 m" under 1 km, "2.3 km" above.
 */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Suggested restaurants: the first SUGGESTION_COUNT not visited yet, nearest first when the position is known, in
 * the API order otherwise. A restaurant without coordinates (the API sends null) is measured from (0, 0), so it
 * comes last, as in the Vue app.
 */
function nearbyUnvisited(
  restaurants: readonly Restaurant[],
  visitedIds: ReadonlySet<string>,
  position: UserPosition | null,
): RestaurantWithDistance[] {
  const withDistance: RestaurantWithDistance[] = restaurants
    .filter((r) => !visitedIds.has(r.id))
    .map((r) => ({
      ...r,
      distance: position ? haversineKm(position.lat, position.lon, r.lat, r.lng) : null,
    }));
  if (position) {
    withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }
  return withDistance.slice(0, SUGGESTION_COUNT);
}

/**
 * Explore page (/explore): a few restaurants the user has not tried yet, nearest first when the location is allowed.
 */
@Component({
  selector: 'app-explore',
  styleUrl: './explore.scss',
  templateUrl: './explore.html',
})
export class Explore {
  /**
   * Opens a restaurant
   */
  private readonly router = inject(Router);

  /**
   * Id of the user whose visits are left out
   */
  private readonly auth = inject(AuthStore);

  /**
   * Reads every restaurant
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Reads the user's visits (community mock data)
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Position of the user, asked for when the page opens
   */
  private readonly userLocation = inject(UserLocation);

  /**
   * Every restaurant and the user's visits, loaded together
   */
  private readonly dataResource = rxResource({
    stream: () =>
      forkJoin({
        restaurants: this.restaurantApi.fetchRestaurants(),
        visits: this.ratingApi.fetchCommunityVisitsByUserId(this.auth.currentUserId),
      }),
  });

  /**
   * True until the location is answered (allowed, refused or unavailable)
   */
  private readonly locating = computed(() =>
    ['idle', 'pending'].includes(this.userLocation.status()),
  );

  /**
   * True while the restaurants or the location are loading
   */
  protected readonly loading = computed(() => this.dataResource.isLoading() || this.locating());

  /**
   * True when the position could not be obtained (refused, blocked or unavailable): the restaurants are not sorted
   */
  protected readonly locationDenied = computed(
    () => !this.locating() && this.userLocation.status() !== 'granted',
  );

  /**
   * Restaurants suggested; empty while loading and when the API fails. Re-sorted if the position becomes known later
   */
  protected readonly restaurants = computed(() => {
    if (!this.dataResource.hasValue()) return [];
    const { restaurants, visits } = this.dataResource.value();
    const visitedIds = new Set(visits.map((v) => v.restaurantId));
    return nearbyUnvisited(restaurants, visitedIds, this.userLocation.location());
  });

  /**
   * Formats the distance shown on a card
   */
  protected readonly formatDistance = formatDistance;

  constructor() {
    this.userLocation.requestLocation();
  }

  /**
   * Opens the page of a restaurant
   */
  protected openRestaurant(restaurant: Restaurant): void {
    void this.router.navigateByUrl(`/restaurant/${restaurant.id}`);
  }
}
