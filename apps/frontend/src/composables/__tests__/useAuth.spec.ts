import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import type { RouteLocationNormalized, RouteMeta } from 'vue-router'
import type { SignupData } from '@/types/user'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
      post: vi.fn(),
      interceptors: { response: { use: vi.fn() } },
    },
  }
})

// Shared across module resets so tests can set the current page and inspect the navigation done by the fresh composable
const router = vi.hoisted(() => ({
  replace: vi.fn(),
  currentRoute: { value: { meta: {} as RouteMeta } },
}))
vi.mock('@/router', () => ({ default: router }))

const signupData: SignupData = {
  email: 'me@test.fr',
  password: 'abcdefg1',
  username: 'alex',
  age: 30,
  identity: 'non_binary',
}

/**
 * Imports a fresh copy of the composable: its state is shared at module level
 * and the session is checked on import, so each test starts from a new module.
 */
async function loadAuthModule() {
  vi.resetModules()
  const module = await import('@/composables/useAuth')
  await flushPromises()
  return module
}

async function loadUseAuth() {
  return (await loadAuthModule()).useAuth()
}

/** Runs an API error through the response error handler registered by the freshly imported composable. */
async function failApiCall(error: unknown) {
  const onRejected = vi.mocked(axios.interceptors.response.use).mock.lastCall?.[1]
  await expect(onRejected?.(error)).rejects.toBe(error)
}

function httpError(status: number) {
  return new AxiosError('failed', undefined, undefined, undefined, { status } as AxiosResponse)
}

/** A navigation target with the given access (see RouteMeta.access). */
function page(meta: RouteMeta = {}) {
  return { meta } as RouteLocationNormalized
}

beforeEach(() => {
  vi.resetAllMocks()
  router.currentRoute.value = { meta: {} }
})

describe('useAuth', () => {
  it('is logged in when the session check succeeds', async () => {
    vi.mocked(axios.get).mockResolvedValue({})

    const { isLoggedIn, isReady } = await loadUseAuth()

    expect(isLoggedIn.value).toBe(true)
    expect(isReady.value).toBe(true)
  })

  it('is logged out but ready when the session check fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))

    const { isLoggedIn, isReady } = await loadUseAuth()

    expect(isLoggedIn.value).toBe(false)
    expect(isReady.value).toBe(true)
  })

  it('logs in on successful login', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockResolvedValue({})
    const { isLoggedIn, login } = await loadUseAuth()

    await login('me@test.fr', 'secret')

    expect(isLoggedIn.value).toBe(true)
  })

  it('opens the home page on successful login, once logged in so the guard lets it open', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockResolvedValue({})
    const { isLoggedIn, login } = await loadUseAuth()
    let loggedInDuringNavigation: boolean | undefined
    router.replace.mockImplementation(async () => {
      loggedInDuringNavigation = isLoggedIn.value
    })

    await login('me@test.fr', 'secret')

    expect(router.replace).toHaveBeenCalledWith('/')
    expect(loggedInDuringNavigation).toBe(true)
  })

  it('sends everything entered in the sign up steps, then opens the home page', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockResolvedValue({})
    const { isLoggedIn, signup } = await loadUseAuth()

    await signup(signupData)

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/signup$/),
      signupData,
      { withCredentials: true },
    )
    expect(router.replace).toHaveBeenCalledWith('/')
    expect(isLoggedIn.value).toBe(true)
  })

  it('stays on the current page on failed signup', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockRejectedValue(new Error('409'))
    const { isLoggedIn, signup } = await loadUseAuth()

    await expect(signup(signupData)).rejects.toThrow('409')
    expect(router.replace).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(false)
  })

  it('does not navigate when the session check finds a session', async () => {
    vi.mocked(axios.get).mockResolvedValue({})

    await loadUseAuth()

    expect(router.replace).not.toHaveBeenCalled()
  })

  it('stays logged out and rethrows on failed login', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockRejectedValue(new Error('400'))
    const { isLoggedIn, login } = await loadUseAuth()

    await expect(login('me@test.fr', 'wrong')).rejects.toThrow('400')
    expect(router.replace).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(false)
  })

  it('logs out and opens the login page, even when the logout request fails', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    vi.mocked(axios.post).mockRejectedValue(new Error('network'))
    const { isLoggedIn, logout } = await loadUseAuth()

    await logout()

    expect(isLoggedIn.value).toBe(false)
    expect(router.replace).toHaveBeenCalledWith('/login')
  })

  it('shows the login page when the API rejects the expired session', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    const { isLoggedIn } = await loadUseAuth()

    await failApiCall(httpError(401))

    expect(isLoggedIn.value).toBe(false)
    expect(router.replace).toHaveBeenCalledWith('/login')
  })

  it.each(['guest', 'public'] as const)(
    'stays on a %s page when the API answers 401, so the page can show its error',
    async (access) => {
      vi.mocked(axios.get).mockRejectedValue(new Error('401'))
      await loadUseAuth()
      router.currentRoute.value = { meta: { access } }

      await failApiCall(httpError(401))

      expect(router.replace).not.toHaveBeenCalled()
    },
  )

  it('stays logged in when an API call fails for another reason', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    const { isLoggedIn } = await loadUseAuth()

    await failApiCall(httpError(500))
    await failApiCall(new AxiosError('Network Error'))

    expect(isLoggedIn.value).toBe(true)
    expect(router.replace).not.toHaveBeenCalled()
  })
})

describe('authGuard', () => {
  it('sends a logged-out user from a private page to the login page', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    const { authGuard } = await loadAuthModule()

    expect(await authGuard(page())).toBe('/login')
    expect(await authGuard(page({ access: 'guest' }))).toBe(true)
    expect(await authGuard(page({ access: 'public' }))).toBe(true)
  })

  it('sends a logged-in user from the login and sign up pages to the home page', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    const { authGuard } = await loadAuthModule()

    expect(await authGuard(page({ access: 'guest' }))).toBe('/')
    expect(await authGuard(page())).toBe(true)
    expect(await authGuard(page({ access: 'public' }))).toBe(true)
  })

  it('waits for the session check before choosing the first page', async () => {
    let endSessionCheck: (value: unknown) => void = () => {}
    vi.mocked(axios.get).mockReturnValue(new Promise((resolve) => (endSessionCheck = resolve)))
    const { authGuard } = await loadAuthModule()

    const decision = authGuard(page({ access: 'guest' }))
    endSessionCheck({})

    expect(await decision).toBe('/')
  })

  it('follows the session once logged out', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    vi.mocked(axios.post).mockResolvedValue({})
    const { authGuard, useAuth } = await loadAuthModule()

    await useAuth().logout()

    expect(await authGuard(page())).toBe('/login')
  })
})
