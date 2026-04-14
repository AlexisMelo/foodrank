import { ref, readonly } from 'vue'
import type { User } from '@/types/restaurant'
import { fetchUserById } from '@/services/restaurantService'

const CURRENT_USER_ID = 'alex'

const isLoggedIn = ref(false)
const isReady = ref(false)
const currentUser = ref<User | null>(null)

/**
 * Checks the server-side session by calling GET /api/auth/me.
 * The backend validates the HttpOnly cookie and returns 200 or 401.
 * Called once on module load so all components share the same state.
 */
async function checkSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    isLoggedIn.value = res.ok
  } catch {
    isLoggedIn.value = false
  } finally {
    isReady.value = true
  }
}

checkSession()

/**
 * Fetches the app-level User profile for the current user and caches it.
 * No-ops if the profile has already been loaded.
 */
async function init() {
  if (currentUser.value) return
  currentUser.value = (await fetchUserById(CURRENT_USER_ID)) ?? null
}

/**
 * Composable for auth state shared across all components (singleton).
 *
 * @returns
 * - `isLoggedIn`   — `true` when a valid session cookie exists.
 * - `isReady`      — `false` until the initial /api/auth/me check resolves;
 *                    prevents a flash of the auth form on page load.
 * - `currentUser`  — app-level User profile, populated after `init()`.
 * - `currentUserId`— hardcoded user ID (temporary, until real user lookup is wired up).
 * - `init()`       — loads `currentUser` from the backend; call once after login.
 */
function setLoggedIn(value: boolean) {
  isLoggedIn.value = value
}

export function useAuth() {
  return {
    isLoggedIn: readonly(isLoggedIn),
    isReady: readonly(isReady),
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    init,
    setLoggedIn,
  }
}
