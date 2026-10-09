import axios from 'axios'
import type { Restaurant, PlaceSuggestion, SearchArea } from '@/types/restaurant'
import type { UserLocation } from '@/composables/useUserLocation'

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
