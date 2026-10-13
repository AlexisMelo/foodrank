export interface Restaurant {
  id: string
  name: string
  cuisine: string
  score: number
  emoji: string
  address: string
  description: string
  tags: string[]
  lat: number
  lng: number
}

/** A restaurant returned by the place search (not necessarily stored in our database yet). */
export interface PlaceSuggestion {
  placeId: string
  name: string
  secondaryText: string
}

/** Area around which restaurant searches are centered. */
export interface SearchArea {
  /** City name, null when it could not be determined */
  locality: string | null
  /** True when the API used its default city because no user position was sent */
  isDefault: boolean
}
