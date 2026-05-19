import type { Restaurant, CommunityVisit, User, Tierlist, ApiResponse } from '@/types/restaurant'
import mockRestaurants from '@/data/restaurants.json'
import mockCommunityRatings from '@/data/community-ratings.json'
import mockUsers from '@/data/users.json'
import mockTierlists from '@/data/tierlists.json'

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

export async function fetchAllCommunityVisits(): Promise<CommunityVisit[]> {
  await delay(200)
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
}

export async function fetchCommunityVisitsByRestaurantId(
  restaurantId: string,
): Promise<CommunityVisit[]> {
  await delay(200)
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
    .filter((v) => v.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchCommunityVisitsByUserId(userId: string): Promise<CommunityVisit[]> {
  await delay(200)
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
    .filter((v) => v.user.id === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchUserById(id: string): Promise<User | undefined> {
  await delay(200)
  const response = mockUsers as ApiResponse<User[]>
  return response.data.find((u) => u.id === id)
}

export async function fetchTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  await delay(200)
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function fetchTierlistById(id: string): Promise<Tierlist | undefined> {
  await delay(200)
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data.find((t) => t.id === id)
}

export async function fetchPinnedTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  await delay(200)
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data.filter((t) => t.userId === userId && t.pinned)
}
