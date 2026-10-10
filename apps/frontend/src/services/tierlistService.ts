import axios from 'axios'
import type { Tierlist, TierlistInput } from '@/types/tierlist'
import mockTierlists from '@/data/tierlists.json'

// Tierlists are not read from the API yet: they are read from local mock data, shaped like the API responses
const tierlists: Tierlist[] = mockTierlists

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
 * Get the tierlists of a user, most recently created first
 */
export async function fetchTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  return tierlists
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Get a tierlist from its id
 * @returns undefined when it does not exist
 */
export async function fetchTierlistById(id: string): Promise<Tierlist | undefined> {
  return tierlists.find((t) => t.id === id)
}

/**
 * Get the tierlists a user pinned on its profile
 */
export async function fetchPinnedTierlistsByUserId(userId: string): Promise<Tierlist[]> {
  return tierlists.filter((t) => t.userId === userId && t.pinned)
}
