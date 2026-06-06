import axios from 'axios'
import { ref, readonly } from 'vue'
import type { User } from '@/types/restaurant'

const CURRENT_USER_ID = 'alex'

const isLoggedIn = ref(false)
const isReady = ref(false)
const currentUser = ref<User | null>(null)

let resolveReady!: () => void
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve
})

async function checkSession() {
  try {
    await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, { withCredentials: true })
    isLoggedIn.value = true
  } catch {
    isLoggedIn.value = false
  } finally {
    isReady.value = true
    resolveReady()
  }
}

async function login(email: string, password: string) {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`,
    { email, password },
    { withCredentials: true },
  )
  isLoggedIn.value = true
}

async function signup(email: string, password: string) {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`,
    { email, password },
    { withCredentials: true },
  )
  isLoggedIn.value = true
}

async function logout() {
  isLoggedIn.value = false
  await axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, null, { withCredentials: true })
    .catch(() => {})
}

checkSession()

export function useAuth() {
  return {
    isLoggedIn: readonly(isLoggedIn),
    isReady: readonly(isReady),
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    waitForReady: () => readyPromise,
    login,
    signup,
    logout,
  }
}
