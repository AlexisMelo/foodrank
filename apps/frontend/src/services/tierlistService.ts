import axios from 'axios'
import type { Tierlist, TierlistInput } from '@/types/tierlist'
import { ME } from '@/services/userService'

/**
 * Create a tierlist, without restaurants, for the logged-in user
 * @throws the axios error: 400 for invalid values, 401 when not logged in
 */
export async function createTierlist(tierlist: TierlistInput): Promise<void> {
  await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tierlists`, tierlist, {
    withCredentials: true,
  })
}

/**
 * Get the tierlists of a user (the logged-in user by default), with their restaurants, most recently created first
 */
export async function fetchTierlistsByUserId(userId: string = ME): Promise<Tierlist[]> {
  const response = await axios.get<Tierlist[]>(
    `${import.meta.env.VITE_API_BASE_URL}/api/users/${encodeURIComponent(userId)}/tierlists`,
    { withCredentials: true },
  )
  return response.data
}

/**
 * Get a tierlist, of any user, with its restaurants
 * @param id id of the tierlist, as read from the url
 * @returns undefined when it does not exist
 */
export async function fetchTierlistById(id: string | number): Promise<Tierlist | undefined> {
  try {
    const response = await axios.get<Tierlist>(
      `${import.meta.env.VITE_API_BASE_URL}/api/tierlists/${encodeURIComponent(id)}`,
      { withCredentials: true },
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return undefined
    throw error
  }
}

/**
 * Get the tierlists a user (the logged-in user by default) pinned to its profile, most recently created first
 */
export async function fetchPinnedTierlistsByUserId(userId: string = ME): Promise<Tierlist[]> {
  return (await fetchTierlistsByUserId(userId)).filter((t) => t.pinned)
}
