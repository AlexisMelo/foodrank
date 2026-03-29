import { ref, readonly } from 'vue'
import type { User } from '@/types/restaurant'
import { fetchUserById } from '@/services/restaurantService'

// Simulates what a real auth response would return.
// Replace this with a JWT decode or /me API call when the backend is ready.
const CURRENT_USER_ID = 'alex'

const currentUser = ref<User | null>(null)

async function init() {
  if (currentUser.value) return
  currentUser.value = (await fetchUserById(CURRENT_USER_ID)) ?? null
}

export function useAuth() {
  return {
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    init,
  }
}
