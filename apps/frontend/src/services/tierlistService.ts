import type { Tierlist } from '@/types/tierlist'
import mockTierlists from '@/data/tierlists.json'

// Tierlists are not served by the API yet: they are read from local mock data, shaped like the API responses
const tierlists: Tierlist[] = mockTierlists

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
