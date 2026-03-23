export interface Restaurant {
  id: string
  rank: number
  name: string
  cuisine: string
  score: number
  emoji: string
  address: string
  priceRange: string
  description: string
  openNow: boolean
  tags: string[]
}

export interface Visit {
  id: string
  restaurantId: string
  date: string
  food: number
  service: number
  decor: number
}

export interface ApiResponse<T> {
  data: T
  meta: {
    total: number
    updatedAt: string
  }
}
