import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, map, timer } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import type { Restaurant } from '@/core/models/restaurant.model';

/**
 * Number of restaurants suggested.
 */
const SUGGESTION_COUNT = 5;

/**
 * Longest wait for the user's position before showing the suggestions unsorted, in milliseconds. The browser only
 * starts its own timeout once the permission is granted: without this one, an unanswered prompt would keep the page
 * loading forever.
 */
const LOCATION_WAIT_MS = 3000;

/**
 * A restaurant suggested, with its distance from the user.
 */
interface RestaurantWithDistance extends Restaurant {
  /**
   * Distance from the user in kilometers; null when the user's position or the restaurant's coordinates are unknown
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
 * the API order otherwise. A restaurant without coordinates has no distance and comes after every measured one, as
 * in the API's place ranking.
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
      distance:
        position && r.lat !== null && r.lng !== null
          ? haversineKm(position.lat, position.lon, r.lat, r.lng)
          : null,
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
   * Reads every restaurant
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Reads the logged-in user's ratings: the restaurants they rated are left out
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Position of the user, asked for when the page opens
   */
  private readonly userLocation = inject(UserLocation);

  /**
   * Every restaurant and the logged-in user's ratings, loaded together
   */
  private readonly dataResource = rxResource({
    stream: () =>
      forkJoin({
        restaurants: this.restaurantApi.fetchRestaurants(),
        ratings: this.ratingApi.fetchUserRatings(),
      }),
  });

  /**
   * True once LOCATION_WAIT_MS have passed since the page opened
   */
  private readonly locationWaitOver = toSignal(timer(LOCATION_WAIT_MS).pipe(map(() => true)), {
    initialValue: false,
  });

  /**
   * True until the location is answered (allowed, refused or unavailable), or for LOCATION_WAIT_MS at most
   */
  private readonly locating = computed(
    () => ['idle', 'pending'].includes(this.userLocation.status()) && !this.locationWaitOver(),
  );

  /**
   * True while the restaurants or the location are loading
   */
  protected readonly loading = computed(() => this.dataResource.isLoading() || this.locating());

  /**
   * True when the position is not known once the wait is over (refused, blocked, unavailable or still not answered):
   * the restaurants are not sorted
   */
  protected readonly locationDenied = computed(
    () => !this.locating() && this.userLocation.status() !== 'granted',
  );

  /**
   * Restaurants suggested; empty while loading and when the API fails. Re-sorted if the position becomes known later
   */
  protected readonly restaurants = computed(() => {
    if (!this.dataResource.hasValue()) return [];
    const { restaurants, ratings } = this.dataResource.value();
    const visitedIds = new Set(ratings.map((r) => r.restaurantId));
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
