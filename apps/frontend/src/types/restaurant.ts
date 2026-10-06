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

export interface Visit {
  id: string
  restaurantId: string
  date: string
  food: number
  service: number
  decor: number
}

/**
 * Rating sent by the rating page (POST /api/restaurants/:id/ratings), stored in the `rating` table
 * (food_rating, service_rating, setting_rating, bonus: see database.types.ts).
 */
export interface RatingInput {
  /** 0 to 100 */
  food: number
  /** 0 to 100 */
  service: number
  /** Setting (decor), 0 to 100 */
  setting: number
  /** "Instant crush" favorite bonus */
  bonus: boolean
}

export interface CommunityVisit extends Visit {
  user: {
    id: string
    name: string
    avatar: string
  }
}

export interface User {
  id: string
  name: string
  avatar: string
  bio: string
}

export interface TierlistEntry {
  restaurantId: string
  addedAt: string
}

export interface Tierlist {
  id: string
  userId: string
  name: string
  description: string
  emoji: string
  restaurants: TierlistEntry[]
  createdAt: string
  updatedAt: string
  pinned: boolean
}

export interface ApiResponse<T> {
  data: T
  meta: {
    total: number
    updatedAt: string
  }
}
