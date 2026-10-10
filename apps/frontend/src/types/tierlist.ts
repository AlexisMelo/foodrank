export interface TierlistEntry {
  restaurantId: string
  addedAt: string
}

/**
 * Tierlist sent by the creation page (POST /api/tierlists), stored in the `tierlists` table
 * (emoji, name, description, pinned: see database.types.ts). It is created without restaurants.
 */
export interface TierlistInput {
  /** A single emoji, used as the tierlist picture */
  emoji: string
  /** Not blank, at most TIERLIST_NAME_MAX_LENGTH characters */
  name: string
  /** At most TIERLIST_DESCRIPTION_MAX_LENGTH characters, null when there is none */
  description: string | null
  /** Pinned to the user's profile */
  pinned: boolean
}

export interface Tierlist {
  id: string
  userId: string
  name: string
  description: string
  emoji: string
  restaurants: TierlistEntry[]
  createdAt: string
  updatedAt: string
  pinned: boolean
}
