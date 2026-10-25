import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, timer } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';

/**
 * Number of restaurants suggested.
 */
const SUGGESTION_COUNT = 5;

/**
 * Longest wait for the user's position before showing the suggestions sorted from the API's default city, in
 * milliseconds. The browser only starts its own timeout once the permission is granted: without this one, an
 * unanswered prompt would keep the page loading forever.
 */
const LOCATION_WAIT_MS = 3000;

/**
 * A distance for display: "850 m" under 1 km, "2.3 km" above.
 */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Explore page (/explore): a few restaurants the user has not tried yet, nearest first when the location is allowed.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-explore',
  styleUrl: './explore.scss',
  templateUrl: './explore.html',
})
export class Explore {
  /**
   * Reads the suggestions of the logged-in user
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Position of the user, asked for when the page opens
   */
  private readonly userLocation = inject(UserLocation);

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
   * Suggestions of the API (GET /api/restaurants/suggestions). Idle while locating, so they are asked once with the
   * position when it is answered in time; asked again, sorted, if the position becomes known later
   */
  private readonly suggestionsResource = rxResource({
    params: () => (this.locating() ? undefined : { location: this.userLocation.location() }),
    stream: ({ params }) => this.restaurantApi.fetchSuggestions(params.location, SUGGESTION_COUNT),
  });

  /**
   * True while the location or the suggestions are loading
   */
  protected readonly loading = computed(
    () => this.locating() || this.suggestionsResource.isLoading(),
  );

  /**
   * True when the position is not known once the wait is over (refused, blocked, unavailable or still not answered):
   * the restaurants are sorted from the API's default city and shown with their address instead of a distance
   */
  protected readonly locationDenied = computed(
    () => !this.locating() && this.userLocation.status() !== 'granted',
  );

  /**
   * Restaurants suggested, in the API order; empty while loading and when the API fails
   */
  protected readonly suggestions = computed(() =>
    this.suggestionsResource.hasValue() ? this.suggestionsResource.value() : [],
  );

  /**
   * Formats the distance shown on a card
   */
  protected readonly formatDistance = formatDistance;

  constructor() {
    this.userLocation.requestLocation();
  }
}
