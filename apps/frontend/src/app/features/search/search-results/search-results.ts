import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { PLACE_SEARCH_MIN_LENGTH, RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSuggestion } from '@/core/models/restaurant.model';

/**
 * Search results page (/search?q=…), opened with Enter from the new review sheet: the place suggestions of the query,
 * then a longer search on demand ("Load more").
 */
@Component({
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
   * Opens the restaurant picked
   */
  private readonly router = inject(Router);

  /**
   * Requests the suggestions and the longer search
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Position of the user, sent with the searches to favor nearby restaurants; asked for when the page opens
   */
  private readonly userLocation = inject(UserLocation);

  /**
   * Query searched, trimmed; empty when missing
   */
  protected readonly query = computed(() => (this.q() ?? '').trim());

  /**
   * True when the query is long enough to be searched
   */
  protected readonly searchable = computed(() => this.query().length >= PLACE_SEARCH_MIN_LENGTH);

  /**
   * Suggestions of the query, reloaded each time it changes (an answer to an outdated query is ignored); idle when
   * the query is too short
   */
  private readonly suggestionsResource = rxResource({
    params: () => (this.searchable() ? this.query() : undefined),
    stream: ({ params: query }) =>
      this.restaurantApi.autocompletePlaces(query, this.userLocation.location()),
  });

  /**
   * True once "Load more" was clicked for the current query; reset when the query changes
   */
  private readonly moreRequested = linkedSignal({ source: this.query, computation: () => false });

  /**
   * Longer search of the query, once "Load more" was clicked; dropped when the query changes
   */
  private readonly moreResource = rxResource({
    params: () => (this.moreRequested() ? this.query() : undefined),
    stream: ({ params: query }) =>
      this.restaurantApi.searchPlaces(query, this.userLocation.location()),
  });

  /**
   * True while the suggestions load: placeholders are shown
   */
  protected readonly loading = this.suggestionsResource.isLoading;

  /**
   * True while the longer search runs
   */
  protected readonly loadingMore = this.moreResource.isLoading;

  /**
   * True once the longer search answered: the "Load more" button is hidden
   */
  protected readonly moreLoaded = computed(() => this.moreResource.hasValue());

  /**
   * True when the last search failed: the suggestions, or the longer search once it was asked for
   */
  protected readonly error = computed(() =>
    this.moreRequested()
      ? this.moreResource.status() === 'error'
      : this.suggestionsResource.status() === 'error',
  );

  /**
   * Suggestions, followed by the results of the longer search not already shown; empty while loading, when the
   * query is too short and when the suggestions failed
   */
  protected readonly results = computed<PlaceSuggestion[]>(() => {
    const suggestions = this.suggestionsResource.hasValue() ? this.suggestionsResource.value() : [];
    if (!this.moreResource.hasValue()) return suggestions;
    const known = new Set(suggestions.map((r) => r.placeId));
    return [...suggestions, ...this.moreResource.value().filter((r) => !known.has(r.placeId))];
  });

  /**
   * Numbers of the placeholders shown while loading
   */
  protected readonly skeletons = Array.from({ length: 10 }, (_, i) => i + 1);

  constructor() {
    this.userLocation.requestLocation();
  }

  /**
   * Longer search: appends the results not already shown; tries again after an error
   */
  protected loadMore(): void {
    if (this.moreRequested()) {
      this.moreResource.reload();
    } else {
      this.moreRequested.set(true);
    }
  }

  /**
   * Opens the restaurant page, which gets or creates the restaurant in the database
   */
  protected selectPlace(place: PlaceSuggestion): void {
    void this.router.navigateByUrl(`/restaurant/place/${encodeURIComponent(place.placeId)}`);
  }
}
