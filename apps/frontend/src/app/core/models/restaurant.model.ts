import type { UserSummary } from './user.model';

/**
 * A restaurant stored in our database (GET /api/restaurants, GET /api/restaurants/:id).
 */
export interface Restaurant {
  /**
   * Database id, used in /restaurant/:id
   */
  id: string;

  /**
   * Name of the restaurant
   */
  name: string;

  /**
   * Emoji displayed next to the restaurant name
   */
  emoji: string;

  /**
   * Postal address, empty when unknown
   */
  address: string;

  /**
   * Free text description, empty when there is none
   */
  description: string;

  /**
   * Latitude in degrees, always known (required by the database)
   */
  lat: number;

  /**
   * Longitude in degrees, always known (required by the database)
   */
  lng: number;
}

/**
 * A restaurant the logged-in user has not rated yet, suggested on the Explore page (GET /api/restaurants/suggestions).
 */
export interface RestaurantSuggestion {
  /**
   * The suggested restaurant
   */
  restaurant: Restaurant;

  /**
   * Distance from the user in kilometers, computed by the API; null when the user's position was not sent
   */
  distanceKm: number | null;

  /**
   * Average of every criterion of the restaurant's active ratings (each user's latest), 1 to 10, not rounded; null when
   * nobody rated it
   */
  globalScore: number | null;

  /**
   * Users the logged-in user follows who rated the restaurant, the most recent rating first, each listed once; empty
   * when none did
   */
  followedRaters: UserSummary[];
}

/**
 * Answer of POST /api/restaurants/from-place: the restaurant of a place selected in the search.
 */
export interface RestaurantFromPlace {
  /**
   * The restaurant, stored in our database
   */
  restaurant: Restaurant;

  /**
   * True when this request stored it: the user is the first to open the place. False when it already existed,
   * including when another user stored it at the same moment
   */
  created: boolean;
}

/**
 * A restaurant returned by the place search (not necessarily stored in our database yet).
 */
export interface PlaceSuggestion {
  /**
   * Id of the place at the place provider (e.g. "N5287924742" for OpenStreetMap), sent back when it is selected
   */
  placeId: string;

  /**
   * Name of the place
   */
  name: string;

  /**
   * Line displayed under the name: the address
   */
  secondaryText: string;
}
