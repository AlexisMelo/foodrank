/** A restaurant stored in our database (GET /api/restaurants, GET /api/restaurants/:id). */
export interface Restaurant {
  /** Database id, used in /restaurant/:id */
  id: string;
  /** Name of the restaurant */
  name: string;
  /** Type of cuisine, e.g. "Italian"; empty when unknown */
  cuisine: string;
  /** Not sent by the API (its restaurant has no score): undefined at runtime */
  score: number;
  /** Emoji displayed next to the restaurant name */
  emoji: string;
  /** Postal address, empty when unknown */
  address: string;
  /** Free text description, empty when there is none */
  description: string;
  /** Not sent by the API (its restaurant has no tags): undefined at runtime */
  tags: string[];
  /** Latitude in degrees; the API sends null when it is unknown */
  lat: number;
  /** Longitude in degrees; the API sends null when it is unknown */
  lng: number;
}

/** A restaurant returned by the place search (not necessarily stored in our database yet). */
export interface PlaceSuggestion {
  /** Id of the place at the place provider (e.g. "N5287924742" for OpenStreetMap), sent back when it is selected */
  placeId: string;
  /** Name of the place */
  name: string;
  /** Line displayed under the name: the address */
  secondaryText: string;
}

/** Area around which restaurant searches are centered. */
export interface SearchArea {
  /** City name, null when it could not be determined */
  locality: string | null;
  /** True when the API used its default city because no user position was sent */
  isDefault: boolean;
}
