import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import {
  fetchMyRatings,
  fetchRatingSummary,
  fetchRecentRatings,
  fetchUserRatings,
  rateRestaurant,
} from '@/services/ratingService'

// Keep axios' real helpers (isAxiosError...) but intercept the HTTP calls
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, get: vi.fn(), post: vi.fn() } }
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

describe('rateRestaurant', () => {
  it('posts the rating with the session cookie, encoding the restaurant id', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
    const rating = { food: 80, service: 60, setting: 40, bonus: true }

    await rateRestaurant('a/b', rating)

    expect(axios.post).toHaveBeenCalledWith(
      'http://api.test/api/restaurants/a%2Fb/ratings',
      rating,
      { withCredentials: true },
    )
  })

  it('rethrows API errors so the page can explain them', async () => {
    vi.mocked(axios.post).mockRejectedValue(httpError(409))

    await expect(
      rateRestaurant('r1', { food: 50, service: 50, setting: 50, bonus: false }),
    ).rejects.toThrow('HTTP error')
  })
})

describe('fetchRatingSummary', () => {
  it("gets the restaurant's averages, encoding the restaurant id", async () => {
    const summary = { count: 2, food: 80, service: 50, setting: 25, global: 51.7 }
    vi.mocked(axios.get).mockResolvedValue({ data: summary })

    expect(await fetchRatingSummary('a/b')).toEqual(summary)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/restaurants/a%2Fb/ratings/summary')
  })
})

describe('fetchRecentRatings', () => {
  it('asks for the 5 most recent ratings by default, encoding the restaurant id', async () => {
    const ratings = [{ userId: 'u1', date: '2026-03-07', userName: 'Camille' }]
    vi.mocked(axios.get).mockResolvedValue({ data: ratings })

    expect(await fetchRecentRatings('a/b')).toEqual(ratings)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/restaurants/a%2Fb/ratings', {
      params: { limit: 5 },
    })
  })

  it('rethrows API errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(503))

    await expect(fetchRecentRatings('r1')).rejects.toThrow('HTTP error')
  })
})

describe('fetchMyRatings', () => {
  it("returns the logged-in user's ratings, sending the session cookie", async () => {
    const ratings = [{ userId: 'me', date: '2026-03-07' }]
    vi.mocked(axios.get).mockResolvedValue({ data: ratings })

    expect(await fetchMyRatings('a/b')).toEqual(ratings)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/restaurants/a%2Fb/ratings/mine', {
      withCredentials: true,
    })
  })

  it('returns no rating when the user is not logged in', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(401))

    expect(await fetchMyRatings('r1')).toEqual([])
  })

  it('rethrows other errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(404))

    await expect(fetchMyRatings('r1')).rejects.toThrow('HTTP error')
  })
})

describe('fetchUserRatings', () => {
  it("returns the logged-in user's ratings by default", async () => {
    const ratings = [{ restaurantId: 'r1', date: '2026-03-07' }]
    vi.mocked(axios.get).mockResolvedValue({ data: ratings })

    expect(await fetchUserRatings()).toEqual(ratings)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/me/ratings', {
      withCredentials: true,
    })
  })

  it('reads the ratings of another user by id', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })

    await fetchUserRatings('u2')

    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/u2/ratings', {
      withCredentials: true,
    })
  })
})
