import axios from 'axios'
import { ref, readonly } from 'vue'
import type { User } from '@/types/user'
import router from '@/router'

const CURRENT_USER_ID = 'alex'

const isLoggedIn = ref(false)
const isReady = ref(false)
const currentUser = ref<User | null>(null)

/**
 * Check if the user is currently logged in by making a request to the backend.
 */
async function checkSession() {
  try {
    await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, { withCredentials: true })
    isLoggedIn.value = true
  } catch {
    isLoggedIn.value = false
  } finally {
    isReady.value = true
  }
}

/**
 * Go to the home page, then show the app. Navigating first keeps the route the user was on while
 * logged out (e.g. /settings after a logout) from being mounted, even for a frame.
 */
async function enterApp() {
  await router.replace('/')
  isLoggedIn.value = true
}

/**
 * Sign in the user using email & password, then open the home page
 * @param email
 * @param password
 */
async function login(email: string, password: string) {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`,
    { email, password },
    { withCredentials: true },
  )
  await enterApp()
}

/**
 * Create an account using email & password, then open the home page
 * @param email
 * @param password
 */
async function signup(email: string, password: string) {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`,
    { email, password },
    { withCredentials: true },
  )
  await enterApp()
}

async function logout() {
  isLoggedIn.value = false
  await axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, null, { withCredentials: true })
    .catch(() => {})
}

/**
 * Show the login page as soon as the API rejects the session (e.g. the token expired while the app was open),
 * instead of leaving pages that cannot load their data.
 */
axios.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) isLoggedIn.value = false
  return Promise.reject(error)
})

checkSession()

export function useAuth() {
  return {
    isLoggedIn: readonly(isLoggedIn),
    isReady: readonly(isReady),
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    login,
    signup,
    logout,
    checkSession,
  }
}
