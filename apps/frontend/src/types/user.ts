export interface User {
  id: string
  name: string
  avatar: string
  bio: string
}

/** Profile of a user (GET /api/users/:id or /api/users/me). */
export interface UserProfile {
  id: string
  /** Full name, else user name, else "Anonymous" */
  name: string
  /** Profile picture, null when there is none */
  avatarUrl: string | null
  /** Number of distinct restaurants rated (a restaurant rated twice counts once) */
  ratedRestaurantsCount: number
}
