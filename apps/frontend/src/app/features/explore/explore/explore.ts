import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { LocationStore } from '@/core/location/location-store';
import { SuggestionCard } from '../suggestion-card/suggestion-card';

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
 * Explore page (/explore): the section of a few restaurants near the user they have not tried yet, nearest first when
 * the location is allowed, with their global score and the users followed who ate there.
 */
@Component({
  imports: [SuggestionCard],
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
   * Suggestions of the API (GET /api/restaurants/suggestions). Idle while locating, so they are asked once with the
   * position when it is answered in time; asked again, sorted, if the position becomes known later
   */
  private readonly suggestionsResource = rxResource({
    params: () => (this.locating() ? undefined : { location: this.locationStore.location() }),
    stream: ({ params }) => this.restaurantApi.fetchSuggestions(params.location, SUGGESTION_COUNT),
  });

  /**
   * True while the location or the suggestions are loading
   */
  protected readonly loading = computed(
    () => this.locating() || this.suggestionsResource.isLoading(),
  );

  /**
   * True when the API failed to return the suggestions
   */
  protected readonly loadError = computed(() => this.suggestionsResource.status() === 'error');

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

  /**
   * Restaurants suggested, in the API order; empty while loading and when the API fails
   */
  protected readonly suggestions = computed(() =>
    this.suggestionsResource.hasValue() ? this.suggestionsResource.value() : [],
  );

  constructor() {
    this.locationStore.requestLocation();
  }
}
