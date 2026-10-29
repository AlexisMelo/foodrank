/**
 * Position of the user, sent to the API to center restaurant searches.
 */
export interface UserLocation {
  /**
   * Latitude in degrees
   */
  lat: number;

  /**
   * Longitude in degrees
   */
  lon: number;
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
