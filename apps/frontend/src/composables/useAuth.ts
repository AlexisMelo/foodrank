import axios from 'axios'
import { ref, readonly } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { SignupData, User } from '@/types/user'
import router from '@/router'
import { sessionRedirect } from '@/utils/auth'

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
 * Leave the current page when the session does not allow it anymore: a private page after a logout or an expired
 * session goes to the login page.
 */
async function leaveForbiddenPage() {
  const target = sessionRedirect(router.currentRoute.value.meta.access, isLoggedIn.value)
  if (target) await router.replace(target)
}

/**
 * Show the app, then open the home page. Logged in first, so the navigation guard lets the home page open; the
 * login or sign up page stays displayed until then.
 */
async function enterApp() {
  isLoggedIn.value = true
  await router.replace('/')
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
 * Create the account with everything entered in the sign up steps, then open the home page
 * @param data
 */
async function signup(data: SignupData) {
  await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`, data, {
    withCredentials: true,
  })
  await enterApp()
}

/**
 * Log out, then open the login page
 */
async function logout() {
  isLoggedIn.value = false
  await leaveForbiddenPage()
  await axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, null, { withCredentials: true })
    .catch(() => {})
}

/**
 * Delete the account of the logged-in user with all its data, once its password is confirmed, then open the login
 * page. Rethrows when the deletion fails (e.g. 403 for a wrong password), the user then stays logged in.
 * @param password current password of the user
 */
async function deleteAccount(password: string) {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/delete-account`,
    { password },
    { withCredentials: true },
  )
  isLoggedIn.value = false
  await leaveForbiddenPage()
}

/**
 * Show the login page as soon as the API rejects the session (e.g. the token expired while the app was open),
 * instead of leaving pages that cannot load their data. Login, sign up and public pages are left as they are, so
 * they can show their own error.
 */
axios.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    isLoggedIn.value = false
    void leaveForbiddenPage()
  }
  return Promise.reject(error)
})

// The session is only checked once: afterwards it changes through login, signup, logout and the 401 handler above
const sessionChecked = checkSession()

/**
 * Navigation guard keeping each page to the users it is meant for (see sessionRedirect): logged-out users only see
 * the login, sign up and public pages, logged-in users are sent from the login and sign up pages to the home page.
 * Waits for the session check, so the first page is chosen knowing whether the user is logged in.
 */
export async function authGuard(to: RouteLocationNormalized) {
  await sessionChecked
  return sessionRedirect(to.meta.access, isLoggedIn.value) ?? true
}

export function useAuth() {
  return {
    isLoggedIn: readonly(isLoggedIn),
    isReady: readonly(isReady),
    currentUser: readonly(currentUser),
    currentUserId: CURRENT_USER_ID,
    login,
    signup,
    logout,
    deleteAccount,
    checkSession,
  }
}
