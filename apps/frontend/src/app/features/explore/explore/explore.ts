import { Component, Signal, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Observable, map, timer } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { LocationStore } from '@/core/location/location-store';
import type { UserLocation } from '@/core/models/location.model';
import type { RestaurantSuggestion } from '@/core/models/restaurant.model';
import { SuggestionCard } from '../suggestion-card/suggestion-card';

/**
 * Number of restaurants suggested near the user.
 */
const SUGGESTION_COUNT = 5;

/**
 * Number of restaurants recommended by the users followed.
 */
const RECOMMENDATION_COUNT = 5;

/**
 * Longest wait for the user's position before showing the suggestions sorted from the API's default city, in
 * milliseconds. The browser only starts its own timeout once the permission is granted: without this one, an
 * unanswered prompt would keep the page loading forever.
 */
const LOCATION_WAIT_MS = 3000;

/**
 * A row of restaurants of the page, loaded from the API once the location is answered.
 */
interface RestaurantRow {
  /**
   * True while the location or the restaurants load
   */
  loading: Signal<boolean>;

  /**
   * True when the API failed to return the restaurants
   */
  loadError: Signal<boolean>;

  /**
   * Restaurants of the row, in the API order; empty while loading and when the API fails
   */
  restaurants: Signal<RestaurantSuggestion[]>;
}

/**
 * Explore page (/explore): a few restaurants the user has not tried yet, with their global score and the users followed
 * who ate there. Near them, nearest first when the location is allowed; and recommended by the users they follow,
 * within 10 km.
 */
@Component({
  imports: [SuggestionCard],
  selector: 'app-explore',
  styleUrl: './explore.scss',
  templateUrl: './explore.html',
})
export class Explore {
  /**
   * Reads the suggestions and recommendations of the logged-in user
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Position of the user, asked for when the page opens
   */
  private readonly locationStore = inject(LocationStore);

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
    () => ['idle', 'pending'].includes(this.locationStore.status()) && !this.locationWaitOver(),
  );

  /**
   * Restaurants near the user they have not rated (GET /api/restaurants/suggestions), in the "Near you" section
   */
  protected readonly nearYou = this.loadRow((location) =>
    this.restaurantApi.fetchSuggestions(location, SUGGESTION_COUNT),
  );

  /**
   * Restaurants the users followed recommend, within 10 km (GET /api/restaurants/recommendations), in the
   * "Recommendations" section
   */
  protected readonly recommendations = this.loadRow((location) =>
    this.restaurantApi.fetchRecommendations(location, RECOMMENDATION_COUNT),
  );

  /**
   * True when the position is not known once the wait is over (refused, blocked, unavailable or still not answered):
   * the restaurants are sorted from the API's default city and shown with their address instead of a distance
   */
  protected readonly locationDenied = computed(
    () => !this.locating() && this.locationStore.status() !== 'granted',
  );

  /**
   * City the suggestions are around, shown at the top right so the user understands them: theirs once located, the
   * default city of the API otherwise; null until the API first answered (no chip)
   */
  protected readonly city = this.locationStore.city;

  /**
   * True while the city shown is the default city of the API, not the user's: the chip is dimmed
   */
  protected readonly cityIsDefault = this.locationStore.cityIsDefault;

  /**
   * What the chip of the city means, which it does not write: read by screen readers and shown on hover
   */
  protected readonly cityLabel = computed(() =>
    this.cityIsDefault()
      ? `Location unknown: restaurants around ${this.city()}`
      : `Your location: ${this.city()}`,
  );

  constructor() {
    this.locationStore.requestLocation();
  }

  /**
   * Loads a row of restaurants with `fetch`. Idle while locating, so the restaurants are asked once with the position
   * when it is answered in time; asked again, from the position, if it becomes known later. Must run in an injection
   * context (a field initializer)
   */
  private loadRow(
    fetch: (location: UserLocation | null) => Observable<RestaurantSuggestion[]>,
  ): RestaurantRow {
    const resource = rxResource({
      params: () => (this.locating() ? undefined : { location: this.locationStore.location() }),
      stream: ({ params }) => fetch(params.location),
    });
    return {
      loading: computed(() => this.locating() || resource.isLoading()),
      loadError: computed(() => resource.status() === 'error'),
      restaurants: computed(() => (resource.hasValue() ? resource.value() : [])),
    };
  }
}
