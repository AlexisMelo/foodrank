import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  PLACE_SEARCH_MAX_RESULTS,
  PLACE_SEARCH_MIN_LENGTH,
  RestaurantApi,
} from '@/core/api/restaurant-api';
import { USER_SEARCH_MAX_RESULTS, USER_SEARCH_MIN_LENGTH, UserApi } from '@/core/api/user-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSuggestion } from '@/core/models/restaurant.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { injectOpenPlace } from '@/shared/data/open-place';
import { FIRST_RESULTS, injectPagedSearch } from '@/shared/data/paged-search';
import { SearchAreaHint } from '@/shared/ui/search-area-hint/search-area-hint';
import { SearchBar } from '@/shared/ui/search-bar/search-bar';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Search results page (/search?q=…), opened from the search sheet: the searchbar to change the query, then the
 * restaurants of the query and the users whose pseudonym contains it, each 5 first, then 10 more on each "Show more".
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
   * Restaurants of the query, near the user's position once known: searched again when the position changes, the
   * restaurants shown staying; idle when the query is too short
   */
  protected readonly restaurants = injectPagedSearch(
    () =>
      this.searchable()
        ? { query: this.query(), location: this.userLocation.location() }
        : undefined,
    (params, limit) => this.restaurantApi.searchPlaces(params.query, params.location, limit),
    PLACE_SEARCH_MAX_RESULTS,
  );

  /**
   * Users whose pseudonym contains the query; idle when the query is too short
   */
  protected readonly users = injectPagedSearch(
    () => (this.searchable() ? { query: this.query() } : undefined),
    (params, limit) => this.userApi.searchUsers(params.query, limit),
    USER_SEARCH_MAX_RESULTS,
  );

  /**
   * Numbers of the restaurant placeholders shown while loading
   */
  protected readonly restaurantSkeletons = Array.from({ length: FIRST_RESULTS }, (_, i) => i + 1);

  /**
   * Numbers of the user placeholders shown while loading: fewer than restaurants, a query rarely finding many users
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
   * Opens the restaurant page of the place, storing it on the first time; stays on the results on failure, with the
   * error shown
   */
  protected selectPlace(place: PlaceSuggestion): void {
    void this.places.open(place.placeId);
  }
}
