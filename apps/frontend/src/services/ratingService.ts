import axios from 'axios'
import type { CommunityVisit, RatingInput, RestaurantRating, UserRating } from '@/types/rating'
import { ME } from '@/services/userService'
import mockCommunityRatings from '@/data/community-ratings.json'

// Community visits not served by the API yet are read from local mock data, shaped like the API responses
const communityVisits: CommunityVisit[] = mockCommunityRatings

/**
 * Save the logged-in user's rating of a restaurant for today
 * @throws the axios error: 401 when not logged in, 404 for an unknown restaurant, 409 when already rated today
 */
export async function rateRestaurant(restaurantId: string, rating: RatingInput): Promise<void> {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/restaurants/${encodeURIComponent(restaurantId)}/ratings`,
    rating,
    { withCredentials: true },
  )
}

/**
 * Get the most recent ratings of a restaurant, every user included, most recent first
 * @param limit number of ratings, 1 to 50
 */
export async function fetchRecentRatings(
  restaurantId: string,
  limit = 5,
): Promise<RestaurantRating[]> {
  const response = await axios.get<RestaurantRating[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/restaurants/${encodeURIComponent(restaurantId)}/ratings`,
    { params: { limit } },
  )
  return response.data
}

/**
 * Get every rating the logged-in user gave to a restaurant, most recent first
 * @returns an empty list when the user is not logged in (401)
 */
export async function fetchMyRatings(restaurantId: string): Promise<RestaurantRating[]> {
  try {
    const response = await axios.get<RestaurantRating[]>(
      `${import.meta.env.VITE_API_BASE_URL}/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/mine`,
      { withCredentials: true },
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return []
    throw error
  }
}

/**
 * Get every rating of a user (the logged-in user by default), with its restaurant, most recent first
 */
export async function fetchUserRatings(userId: string = ME): Promise<UserRating[]> {
  const response = await axios.get<UserRating[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/users/${encodeURIComponent(userId)}/ratings`,
    { withCredentials: true },
  )
  return response.data
}

/**
 * Get every community visit from the mock data (not served by the API yet)
 */
export async function fetchAllCommunityVisits(): Promise<CommunityVisit[]> {
  return communityVisits
}

/**
 * Get the community visits of a user from the mock data (not served by the API yet), most recent first
 */
export async function fetchCommunityVisitsByUserId(userId: string): Promise<CommunityVisit[]> {
  return communityVisits
    .filter((v) => v.user.id === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
