/** A restaurant of a tierlist */
export interface TierlistEntry {
  restaurantId: string
  /** When it was added to the tierlist, null when unknown */
  addedAt: string | null
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

/**
 * A tierlist read from the API (GET /api/users/:id/tierlists, GET /api/tierlists/:id), stored in the `tierlists`
 * table with its restaurants in `tierlist_restaurant`.
 */
export interface Tierlist {
  id: number
  /** Id of the user who created it */
  userId: string
  name: string
  /** Null when there is none */
  description: string | null
  /** A single emoji, used as the tierlist picture */
  emoji: string
  /** Restaurants of the tierlist, oldest added first: only restaurants its owner rated */
  restaurants: TierlistEntry[]
  createdAt: string
  /** Last time a restaurant was added, or the creation date when none was added since */
  updatedAt: string
  /** Pinned to its owner's profile */
  pinned: boolean
}
