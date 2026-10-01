import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axios from 'axios'

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

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

  it('stays logged out and rethrows on failed login', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'))
    vi.mocked(axios.post).mockRejectedValue(new Error('400'))
    const { isLoggedIn, login } = await loadUseAuth()

    await expect(login('me@test.fr', 'wrong')).rejects.toThrow()
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
