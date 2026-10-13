import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fetchUserProfile } from '@/services/userService'

// Keep axios' real helpers (isAxiosError...) but intercept the HTTP calls
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, get: vi.fn() } }
})

/**
 * Builds the error axios throws when the API answers with `status`.
 */
function httpError(status: number): AxiosError {
  return new AxiosError('HTTP error', String(status), undefined, undefined, {
    status,
  } as AxiosResponse)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
})

describe('fetchUserProfile', () => {
  it("returns the logged-in user's profile by default, sending the session cookie", async () => {
    const profile = { id: 'u1', name: 'Alexis', avatarUrl: null, ratedRestaurantsCount: 3 }
    vi.mocked(axios.get).mockResolvedValue({ data: profile })

    expect(await fetchUserProfile()).toEqual(profile)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/me', {
      withCredentials: true,
    })
  })

  it('reads another user by id, encoded in the url', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} })

    await fetchUserProfile('a/b')

    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/a%2Fb', {
      withCredentials: true,
    })
  })

  it('returns undefined when the user does not exist', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(404))

    expect(await fetchUserProfile('unknown')).toBeUndefined()
  })

  it('rethrows other errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(503))

    await expect(fetchUserProfile()).rejects.toThrow('HTTP error')
  })
})
