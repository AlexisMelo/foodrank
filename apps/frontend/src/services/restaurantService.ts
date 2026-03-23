import type { Restaurant, Visit, CommunityVisit, ApiResponse } from '@/types/restaurant'
import mockRestaurants from '@/data/restaurants.json'
import mockRatings from '@/data/ratings.json'
import mockCommunityRatings from '@/data/community-ratings.json'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  await delay(300)
  const response = mockRestaurants as ApiResponse<Restaurant[]>
  return response.data
}

export async function fetchRestaurantById(id: string): Promise<Restaurant | undefined> {
  await delay(200)
  const response = mockRestaurants as ApiResponse<Restaurant[]>
  return response.data.find((r) => r.id === id)
}

export async function fetchVisitsByRestaurantId(restaurantId: string): Promise<Visit[]> {
  await delay(200)
  const response = mockRatings as ApiResponse<Visit[]>
  return response.data
    .filter((v) => v.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchCommunityVisitsByRestaurantId(
  restaurantId: string,
): Promise<CommunityVisit[]> {
  await delay(200)
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
    .filter((v) => v.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
}
