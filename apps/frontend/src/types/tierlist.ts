export interface TierlistEntry {
  restaurantId: string
  addedAt: string
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
