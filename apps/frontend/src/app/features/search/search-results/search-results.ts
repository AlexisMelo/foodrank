import { ViewportScroller } from '@angular/common';
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
import { injectPagedSearch } from '@/shared/data/paged-search';
import { type ChipOption, ChoiceChips } from '@/shared/ui/choice-chips/choice-chips';
import { SearchAreaHint } from '@/shared/ui/search-area-hint/search-area-hint';
import { SearchBar } from '@/shared/ui/search-bar/search-bar';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Results shown by the search: all of them, only the restaurants or only the profiles
 */
type SearchFilter = 'all' | 'restaurants' | 'profiles';

/**
 * Filter chips of the search, in display order
 */
const FILTER_OPTIONS: readonly ChipOption<SearchFilter>[] = [
  { key: 'all', label: 'All' },
  { key: 'restaurants', label: 'Restaurants' },
  { key: 'profiles', label: 'Profiles' },
];

/**
 * Results of each type shown by the "All" tab, without "Show more": "See all" opens the tab of the type
 */
const ALL_TAB_RESULTS = 5;

/**
 * Results first shown by the tab of one type (Restaurants, Profiles), then MORE_RESULTS more on each "Show more"
 */
const TYPE_TAB_FIRST_RESULTS = 10;

/**
 * Search results page (/search?q=…&type=…), opened from the search sheet: the searchbar to change the query, the
 * chips filtering the results, then the restaurants of the query and the profiles whose pseudonym contains it. The
 * "All" tab shows 5 of each type with "See all", the tab of one type 10 first, then 10 more on each "Show more".
 */
@Component({
  imports: [ChoiceChips, RouterLink, SearchAreaHint, SearchBar, UserAvatar],
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
   * Results shown as in the URL, from ?type=: "restaurants" or "profiles"; undefined (or any other value) for all
   */
  readonly type = input<string>();

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
   * Scrolls back to the top of the page when "See all" opens the tab of a type
   */
  private readonly viewportScroller = inject(ViewportScroller);

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
   * Filter chips offered above the results
   */
  protected readonly filterOptions = FILTER_OPTIONS;

  /**
   * Results shown, from ?type=; all of them when it is missing or unknown
   */
  protected readonly filter = computed<SearchFilter>(() => {
    const type = this.type();
    return type === 'restaurants' || type === 'profiles' ? type : 'all';
  });

  /**
   * True when the restaurants are shown: not filtered out by the "Profiles" chip
   */
  protected readonly showRestaurants = computed(() => this.filter() !== 'profiles');

  /**
   * True when the profiles are shown: not filtered out by the "Restaurants" chip
   */
  protected readonly showProfiles = computed(() => this.filter() !== 'restaurants');

  /**
   * True on the "All" tab: a few results of each type, with "See all" instead of "Show more"
   */
  protected readonly overview = computed(() => this.filter() === 'all');

  /**
   * Results of each type shown first: fewer on the "All" tab, which shows both types
   */
  private readonly firstResults = computed(() =>
    this.overview() ? ALL_TAB_RESULTS : TYPE_TAB_FIRST_RESULTS,
  );

  /**
   * Restaurants of the query, near the user's position once known: searched again when the position changes, the
   * restaurants shown staying; back to the first ones when the tab changes; idle when the query is too short and while
   * filtered out, then shown again as they were (as many restaurants) and searched again
   */
  protected readonly restaurants = injectPagedSearch(
    () =>
      this.searchable() && this.showRestaurants()
        ? { query: this.query(), location: this.userLocation.location() }
        : undefined,
    (params, limit) => this.restaurantApi.searchPlaces(params.query, params.location, limit),
    this.firstResults,
    PLACE_SEARCH_MAX_RESULTS,
  );

  /**
   * Profiles whose pseudonym contains the query; back to the first ones when the tab changes; idle when the query is
   * too short and while filtered out, then shown again as they were (as many profiles) and searched again
   */
  protected readonly profiles = injectPagedSearch(
    () => (this.searchable() && this.showProfiles() ? { query: this.query() } : undefined),
    (params, limit) => this.userApi.searchUsers(params.query, limit),
    this.firstResults,
    USER_SEARCH_MAX_RESULTS,
  );

  /**
   * Numbers of the restaurant placeholders shown while loading: as many as the "All" tab shows
   */
  protected readonly restaurantSkeletons = Array.from({ length: ALL_TAB_RESULTS }, (_, i) => i + 1);

  /**
   * Numbers of the profile placeholders shown while loading: fewer than restaurants, a query rarely finding many
   * profiles
   */
  protected readonly profileSkeletons = [1, 2, 3];

  /**
   * Line under a profile's name, e.g. "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;

  constructor() {
    this.userLocation.requestLocation();
  }

  /**
   * Opens the results of the query typed in the searchbar (already trimmed, never empty), with the same filter
   */
  protected search(query: string): void {
    void this.router.navigate(['/search'], {
      queryParams: { q: query, type: this.typeParam(this.filter()) },
    });
  }

  /**
   * Shows the results of the chip picked, for the same query; replaces the URL, so Back leaves the search instead of
   * going through every chip picked
   */
  protected filterBy(filter: SearchFilter): void {
    void this.router.navigate(['/search'], {
      queryParams: { q: this.query(), type: this.typeParam(filter) },
      replaceUrl: true,
    });
  }

  /**
   * Shows the tab opened by "See all" from its top: the profiles are lower than the restaurants on the "All" tab
   */
  protected scrollToTop(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  /**
   * Opens the restaurant page of the place, storing it on the first time; stays on the results on failure, with the
   * error shown
   */
  protected selectPlace(place: PlaceSuggestion): void {
    void this.places.open(place.placeId);
  }

  /**
   * Value of ?type= for `filter`: null for all the results, which leaves it out of the URL
   */
  private typeParam(filter: SearchFilter): SearchFilter | null {
    return filter === 'all' ? null : filter;
  }
}
