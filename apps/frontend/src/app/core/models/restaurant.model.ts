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
   * Type of cuisine, e.g. "Italian"; empty when unknown
   */
  cuisine: string;

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
   * Latitude in degrees; null when unknown
   */
  lat: number | null;

  /**
   * Longitude in degrees; null when unknown
   */
  lng: number | null;
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

/**
 * Area around which restaurant searches are centered.
 */
export interface SearchArea {
  /**
   * City name, null when it could not be determined
   */
  locality: string | null;

  /**
   * True when the API used its default city because no user position was sent
   */
  isDefault: boolean;
}
