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
