import axios from 'axios'
import type { UserProfile } from '@/types/user'

/** Id standing for the logged-in user in /api/users/... urls. */
export const ME = 'me'

/**
 * Get the profile of a user (the logged-in user by default)
 * @returns undefined when the user does not exist
 */
export async function fetchUserProfile(userId: string = ME): Promise<UserProfile | undefined> {
  try {
    const response = await axios.get<UserProfile>(
      `${import.meta.env.VITE_API_BASE_URL}/api/users/${encodeURIComponent(userId)}`,
      { withCredentials: true },
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return undefined
    throw error
  }
}
