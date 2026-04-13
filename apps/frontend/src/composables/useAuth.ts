import { ref, readonly } from 'vue'
import type { Session } from '@supabase/supabase-js'
import type { User } from '@/types/restaurant'
import { fetchUserById } from '@/services/restaurantService'
import { supabase } from '@/supabaseClient'

const CURRENT_USER_ID = 'alex'

const session = ref<Session | null>(null)
const currentUser = ref<User | null>(null)
const isReady = ref(false)

supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  isReady.value = true
})

supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
  isReady.value = true
})

/**
 * Fetches the app-level User profile for the hardcoded current user and caches
 * it in `currentUser`. No-ops if the profile has already been loaded.
 */
async function init() {
  if (currentUser.value) return
  currentUser.value = (await fetchUserById(CURRENT_USER_ID)) ?? null
}

/**
 * Composable that exposes Supabase auth state and the current user's profile.
 *
 * State is module-level (singleton), so all callers share the same reactive
 * refs. The Supabase session is initialised once on module load via
 * `getSession()` and kept in sync by `onAuthStateChange`.
 *
 * @returns
 * - `session`      — the active Supabase `Session`, or `null` when logged out.
 * - `isReady`      — `false` until the initial `getSession()` call resolves;
 *                    use this to avoid a flash of the auth form on page load.
 * - `currentUser`  — the app-level `User` profile, populated after `init()`.
 * - `currentUserId`— hardcoded user ID (temporary, until real auth is wired up).
 * - `init()`       — loads `currentUser` from the backend; call once on login.
 */
export function useAuth() {
  return {
    session: readonly(session),
    isReady: readonly(isReady),
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    init,
  }
}
