import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axios from 'axios'

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

// Shared across module resets so tests can inspect the navigation done by the fresh composable
const replace = vi.hoisted(() => vi.fn())
vi.mock('@/router', () => ({ default: { replace } }))

/**
 * Imports a fresh copy of the composable: its state is shared at module level
 * and the session is checked on import, so each test starts from a new module.
 */
async function loadUseAuth() {
  vi.resetModules()
  const { useAuth } = await import('@/composables/useAuth')
  await flushPromises()
  return useAuth()
}

beforeEach(() => {
  vi.resetAllMocks()
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

  it('opens the home page on successful login, before showing the app', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockResolvedValue({})
    const { isLoggedIn, login } = await loadUseAuth()
    let loggedInDuringNavigation: boolean | undefined
    replace.mockImplementation(async () => {
      loggedInDuringNavigation = isLoggedIn.value
    })

    await login('me@test.fr', 'secret')

    expect(replace).toHaveBeenCalledWith('/')
    expect(loggedInDuringNavigation).toBe(false)
  })

  it('opens the home page on successful signup', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockResolvedValue({})
    const { isLoggedIn, signup } = await loadUseAuth()

    await signup('me@test.fr', 'secret')

    expect(replace).toHaveBeenCalledWith('/')
    expect(isLoggedIn.value).toBe(true)
  })

  it('stays on the current page on failed signup', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockRejectedValue(new Error('409'))
    const { isLoggedIn, signup } = await loadUseAuth()

    await expect(signup('me@test.fr', 'secret')).rejects.toThrow('409')
    expect(replace).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(false)
  })

  it('does not navigate when the session check finds a session', async () => {
    vi.mocked(axios.get).mockResolvedValue({})

    await loadUseAuth()

    expect(replace).not.toHaveBeenCalled()
  })

  it('stays logged out and rethrows on failed login', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockRejectedValue(new Error('400'))
    const { isLoggedIn, login } = await loadUseAuth()

    await expect(login('me@test.fr', 'wrong')).rejects.toThrow('400')
    expect(replace).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(false)
  })

  it('logs out even when the logout request fails', async () => {
    vi.mocked(axios.get).mockResolvedValue({})
    vi.mocked(axios.post).mockRejectedValue(new Error('network'))
    const { isLoggedIn, logout } = await loadUseAuth()

    await logout()

    expect(isLoggedIn.value).toBe(false)
  })
})
