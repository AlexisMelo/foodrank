import axios from 'axios'
import type {
  Restaurant,
  CommunityVisit,
  User,
  Tierlist,
  ApiResponse,
  PlaceSuggestion,
  SearchArea,
  RatingInput,
} from '@/types/restaurant'
import type { UserLocation } from '@/composables/useUserLocation'
import mockCommunityRatings from '@/data/community-ratings.json'
import mockUsers from '@/data/users.json'
import mockTierlists from '@/data/tierlists.json'

/**
 * Get all restaurants
 * @returns
 */
export async function fetchRestaurants(): Promise<Restaurant[]> {
  const response = await axios.get<Restaurant[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/restaurants`,
  )
  return response.data
}

/**
 * Get a restaurant from its database id
 * @returns undefined when it does not exist
 */
export async function fetchRestaurantById(id: string): Promise<Restaurant | undefined> {
  try {
    const response = await axios.get<Restaurant>(
      `${import.meta.env.VITE_API_BASE_URL}/api/restaurants/${encodeURIComponent(id)}`,
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return undefined
    throw error
  }
}

/**
 * Get a few restaurant suggestions while the user is typing
 * @param location favors nearby restaurants; the API falls back to its default city when omitted
 */
export async function autocompletePlaces(
  input: string,
  location?: UserLocation | null,
): Promise<PlaceSuggestion[]> {
  const response = await axios.get<PlaceSuggestion[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/places/autocomplete`,
    { params: { input, lat: location?.lat, lon: location?.lon } },
  )
  return response.data
}

/**
 * Get a longer list of restaurants for the search results page
 */
export async function searchPlaces(
  query: string,
  location?: UserLocation | null,
): Promise<PlaceSuggestion[]> {
  const response = await axios.get<PlaceSuggestion[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/places/search`,
    { params: { query, lat: location?.lat, lon: location?.lon } },
  )
  return response.data
}

/**
 * Get the city searches are centered on
 * @param location user position; the API returns its default city when omitted
 */
export async function fetchSearchArea(location?: UserLocation | null): Promise<SearchArea> {
  const response = await axios.get<SearchArea>(
    `${import.meta.env.VITE_API_BASE_URL}/api/places/area`,
    { params: { lat: location?.lat, lon: location?.lon } },
  )
  return response.data
}

/**
 * Get the restaurant matching a search result, creating it in our database on first selection
 */
export async function createRestaurantFromPlace(placeId: string): Promise<Restaurant> {
  const response = await axios.post<Restaurant>(
    `${import.meta.env.VITE_API_BASE_URL}/api/restaurants/from-place`,
    { placeId },
  )
  return response.data
}

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

export async function fetchAllCommunityVisits(): Promise<CommunityVisit[]> {
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
}

export async function fetchCommunityVisitsByRestaurantId(
  restaurantId: string,
): Promise<CommunityVisit[]> {
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
    .filter((v) => v.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchCommunityVisitsByUserId(userId: string): Promise<CommunityVisit[]> {
  const response = mockCommunityRatings as ApiResponse<CommunityVisit[]>
  return response.data
    .filter((v) => v.user.id === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchUserById(id: string): Promise<User | undefined> {
  const response = mockUsers as ApiResponse<User[]>
  return response.data.find((u) => u.id === id)
}

export async function fetchTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function fetchTierlistById(id: string): Promise<Tierlist | undefined> {
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data.find((t) => t.id === id)
}

export async function fetchPinnedTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  const response = mockTierlists as ApiResponse<Tierlist[]>
  return response.data.filter((t) => t.userId === userId && t.pinned)
}
