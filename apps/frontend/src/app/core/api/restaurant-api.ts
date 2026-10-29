import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { UserLocation } from '@/core/models/location.model';
import type {
  PlaceSuggestion,
  Restaurant,
  RestaurantFromPlace,
  RestaurantSuggestion,
} from '@/core/models/restaurant.model';
import type { SearchPage } from '@/core/models/search.model';
import { locationParams } from './location-params';
import { recoverOnStatus } from './recover-on-status';

/**
 * Shortest query the place search answers, same as the API (PlaceSearchService.MinInputLength); shorter ones return
 * no result.
 */
export const PLACE_SEARCH_MIN_LENGTH = 3;

/**
 * Highest limit of the place search, same as the API (PlaceSearchService.MaxResults): it never returns more results,
 * and refuses a higher limit with a 400.
 */
export const PLACE_SEARCH_MAX_RESULTS = 50;

/**
 * Restaurants of the API (/api/restaurants) and place search (/api/places/search).
 */
@Service()
export class RestaurantApi {
  /**
   * Sends the requests to the API
   */
  private readonly http = inject(HttpClient);

  /**
   * Get the restaurants the logged-in user has not rated yet, nearest first
   * @param location user position; when unknown, the API sorts from its default city and returns no distance
   * @param limit maximum number of suggestions, 1 to 50
   */
  fetchSuggestions(
    location: UserLocation | null,
    limit: number,
  ): Observable<RestaurantSuggestion[]> {
    return this.http.get<RestaurantSuggestion[]>('/api/restaurants/suggestions', {
      params: { limit, ...locationParams(location) },
    });
  }

  /**
   * Get a restaurant from its database id
   * @returns undefined when it does not exist
   */
  fetchRestaurantById(id: string): Observable<Restaurant | undefined> {
    return this.http
      .get<Restaurant>(`/api/restaurants/${encodeURIComponent(id)}`)
      .pipe(recoverOnStatus(404, undefined));
  }

  /**
   * Get the first restaurants matching a query, for the search results page. Asking again with a bigger limit returns
   * the same first results followed by the next ones ("Show more")
   * @param location favors nearby restaurants; the API falls back to its default city when omitted
   * @param limit maximum number of results, 1 to PLACE_SEARCH_MAX_RESULTS
   */
  searchPlaces(
    query: string,
    location: UserLocation | null,
    limit: number,
  ): Observable<SearchPage<PlaceSuggestion>> {
    return this.http.get<SearchPage<PlaceSuggestion>>('/api/places/search', {
      params: { query, limit, ...locationParams(location) },
    });
  }

  /**
   * Get the restaurant matching a search result, creating it in our database on first selection; tells whether this
   * request created it. When two users create the same restaurant at the same time, both get it.
   */
  createRestaurantFromPlace(placeId: string): Observable<RestaurantFromPlace> {
    return this.http.post<RestaurantFromPlace>('/api/restaurants/from-place', { placeId });
  }
}
