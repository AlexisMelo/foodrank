import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  PLACE_SEARCH_MAX_RESULTS,
  PLACE_SEARCH_MIN_LENGTH,
  RestaurantApi,
} from '@/core/api/restaurant-api';
import { USER_SEARCH_MIN_LENGTH, UserApi } from '@/core/api/user-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSearchPage, PlaceSuggestion } from '@/core/models/restaurant.model';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { injectOpenPlace } from '@/shared/data/open-place';
import { SearchAreaHint } from '@/shared/ui/search-area-hint/search-area-hint';
import { SearchBar } from '@/shared/ui/search-bar/search-bar';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Number of restaurants shown first for a query
 */
const FIRST_RESTAURANTS = 5;

/**
 * Number of restaurants added by each "Show more"
 */
const MORE_RESTAURANTS = 10;

/**
 * Search results page (/search?q=…), opened from the search sheet: the searchbar to change the query, then the
 * restaurants of the query (5, then 10 more on each "Show more") and the users whose pseudonym contains it.
 */
@Component({
  imports: [RouterLink, SearchAreaHint, SearchBar, UserAvatar],
  selector: 'app-search-results',
  styleUrl: './search-results.scss',
  templateUrl: './search-results.html',
})
export class SearchResults {
  /**
   * Query as in the URL, from ?q=; undefined when missing
   */
  readonly q = input<string>();

  /**
   * Opens the place picked, storing its restaurant on the first time
   */
  protected readonly places = injectOpenPlace();

  /**
   * Searches the restaurants
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Searches the users
   */
  private readonly userApi = inject(UserApi);

  /**
   * Opens the results of a new query typed in the searchbar
   */
  private readonly router = inject(Router);

  /**
   * Position of the user, sent with the restaurant search to favor nearby restaurants; asked for when the page opens
   */
  private readonly userLocation = inject(UserLocation);

  /**
   * Query searched, trimmed; empty when missing
   */
  protected readonly query = computed(() => (this.q() ?? '').trim());

  /**
   * Shortest query searched: shorter ones would find no restaurant nor user
   */
  protected readonly minLength = Math.max(PLACE_SEARCH_MIN_LENGTH, USER_SEARCH_MIN_LENGTH);

  /**
   * True when the query is long enough to be searched
   */
  protected readonly searchable = computed(() => this.query().length >= this.minLength);

  /**
   * Number of restaurants asked for: FIRST_RESTAURANTS, then MORE_RESTAURANTS more on each "Show more", up to
   * PLACE_SEARCH_MAX_RESULTS; back to FIRST_RESTAURANTS when the query changes
   */
  private readonly restaurantLimit = linkedSignal({
    source: this.query,
    computation: () => FIRST_RESTAURANTS,
  });

  /**
   * First restaurantLimit restaurants of the query, near the user's position once known; searched again when the
   * query, the limit or the position change (an answer to outdated params is ignored); idle when the query is too short
   */
  private readonly restaurantsResource = rxResource({
    params: () =>
      this.searchable()
        ? {
            query: this.query(),
            limit: this.restaurantLimit(),
            location: this.userLocation.location(),
          }
        : undefined,
    stream: ({ params }) =>
      this.restaurantApi.searchPlaces(params.query, params.location, params.limit),
  });

  /**
   * Last restaurants answered for the current query: kept while more load, while searching again near the user and
   * after a failure, so the list does not blink; undefined until the first answer of the query
   */
  private readonly restaurantPage = linkedSignal<
    {
      /**
       * Query searched
       */
      query: string;

      /**
       * Answer of restaurantsResource, undefined while it loads and when it failed
       */
      page: PlaceSearchPage | undefined;
    },
    PlaceSearchPage | undefined
  >({
    source: () => ({
      query: this.query(),
      page: this.restaurantsResource.hasValue() ? this.restaurantsResource.value() : undefined,
    }),
    computation: ({ query, page }, previous) =>
      page ?? (previous?.source.query === query ? previous.value : undefined),
  });

  /**
   * Restaurants shown, best first; empty until the first answer of the query, and when the first search failed
   */
  protected readonly restaurants = computed<PlaceSuggestion[]>(
    () => this.restaurantPage()?.results ?? [],
  );

  /**
   * True while the first restaurants of the query load: placeholders are shown
   */
  protected readonly loadingRestaurants = computed(
    () => this.restaurantsResource.isLoading() && !this.restaurantPage(),
  );

  /**
   * True while more restaurants load, the ones already shown staying
   */
  protected readonly loadingMore = computed(
    () => this.restaurantsResource.isLoading() && !!this.restaurantPage(),
  );

  /**
   * True when the last restaurant search failed: the first restaurants, or more of them
   */
  protected readonly restaurantsError = computed(
    () => this.restaurantsResource.status() === 'error',
  );

  /**
   * True when the search answered and found no restaurant
   */
  protected readonly noRestaurants = computed(() => this.restaurantPage()?.results.length === 0);

  /**
   * True when "Show more" can add restaurants: the last answer said there are more
   */
  protected readonly hasMoreRestaurants = computed(() => this.restaurantPage()?.hasMore ?? false);

  /**
   * Numbers of the restaurant placeholders shown while loading
   */
  protected readonly restaurantSkeletons = Array.from(
    { length: FIRST_RESTAURANTS },
    (_, i) => i + 1,
  );

  /**
   * Users whose pseudonym contains the query, searched again when it changes (an answer to an outdated query is
   * ignored); idle when the query is too short
   */
  private readonly usersResource = rxResource({
    params: () => (this.searchable() ? this.query() : undefined),
    stream: ({ params: query }) => this.userApi.searchUsers(query),
  });

  /**
   * Users found, best matches first; empty while loading and when the search failed
   */
  protected readonly users = computed<UserProfile[]>(() =>
    this.usersResource.hasValue() ? this.usersResource.value() : [],
  );

  /**
   * True while the users load: placeholders are shown
   */
  protected readonly loadingUsers = this.usersResource.isLoading;

  /**
   * True when the user search failed
   */
  protected readonly usersError = computed(() => this.usersResource.status() === 'error');

  /**
   * Numbers of the user placeholders shown while loading
   */
  protected readonly userSkeletons = [1, 2, 3];

  /**
   * Line under a user's name, e.g. "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;

  constructor() {
    this.userLocation.requestLocation();
  }

  /**
   * Opens the results of the query typed in the searchbar (already trimmed, never empty)
   */
  protected search(query: string): void {
    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  /**
   * Asks for MORE_RESTAURANTS more restaurants, without going over what the API returns at most
   */
  protected showMoreRestaurants(): void {
    this.restaurantLimit.update((limit) =>
      Math.min(limit + MORE_RESTAURANTS, PLACE_SEARCH_MAX_RESULTS),
    );
  }

  /**
   * Searches the restaurants again after a failure, with the same limit
   */
  protected retryRestaurants(): void {
    this.restaurantsResource.reload();
  }

  /**
   * Opens the restaurant page of the place, storing it on the first time; stays on the results on failure, with the
   * error shown
   */
  protected selectPlace(place: PlaceSuggestion): void {
    void this.places.open(place.placeId);
  }
}
