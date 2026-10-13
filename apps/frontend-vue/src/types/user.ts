export interface User {
  id: string
  name: string
  avatar: string
  bio: string
}

/** Profile of a user (GET /api/users/:id or /api/users/me). */
export interface UserProfile {
  id: string
  /** User name (pseudonym), else "Anonymous" */
  name: string
  /** Profile picture, null when there is none */
  avatarUrl: string | null
  /** Number of distinct restaurants rated (a restaurant rated twice counts once) */
  ratedRestaurantsCount: number
}

/** Identity chosen when signing up (profiles.identity). */
export type Identity = 'man' | 'woman' | 'non_binary'

/** Body of POST /api/auth/signup: everything entered in the sign up steps. */
export interface SignupData {
  email: string
  password: string
  /** Pseudonym displayed for the user, trimmed */
  username: string
  /** Age in years; the API stores the birth year it gives instead */
  age: number
  identity: Identity
}

/** Sign up being filled, step after step. */
export interface SignupDraft {
  email: string
  password: string
  username: string
  /** '' while empty, like the value of an empty number input */
  age: number | ''
  /** '' until an identity is chosen */
  identity: Identity | ''
}
