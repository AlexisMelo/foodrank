import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { UserLocation } from '@/core/models/location.model';
import type { PlaceSuggestion, Restaurant, SearchArea } from '@/core/models/restaurant.model';
import { recoverOnStatus } from './recover-on-status';

/**
 * Query params of the user position, none when it is unknown (the API then uses its default city)
 */
function locationParams(location?: UserLocation | null): Record<string, number> {
  return location ? { lat: location.lat, lon: location.lon } : {};
}

/** Restaurants of the API (/api/restaurants) and place search (/api/places). */
@Service()
export class RestaurantApi {
  /** Sends the requests to the API */
  private readonly http = inject(HttpClient);

  /**
   * Get all restaurants
   */
  fetchRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>('/api/restaurants');
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
   * Get a few restaurant suggestions while the user is typing
   * @param location favors nearby restaurants; the API falls back to its default city when omitted
   */
  autocompletePlaces(input: string, location?: UserLocation | null): Observable<PlaceSuggestion[]> {
    return this.http.get<PlaceSuggestion[]>('/api/places/autocomplete', {
      params: { input, ...locationParams(location) },
    });
  }

  /**
   * Get a longer list of restaurants for the search results page
   */
  searchPlaces(query: string, location?: UserLocation | null): Observable<PlaceSuggestion[]> {
    return this.http.get<PlaceSuggestion[]>('/api/places/search', {
      params: { query, ...locationParams(location) },
    });
  }

  /**
   * Get the city searches are centered on
   * @param location user position; the API returns its default city when omitted
   */
  fetchSearchArea(location?: UserLocation | null): Observable<SearchArea> {
    return this.http.get<SearchArea>('/api/places/area', { params: locationParams(location) });
  }

  /**
   * Get the restaurant matching a search result, creating it in our database on first selection
   */
  createRestaurantFromPlace(placeId: string): Observable<Restaurant> {
    return this.http.post<Restaurant>('/api/restaurants/from-place', { placeId });
  }
}
