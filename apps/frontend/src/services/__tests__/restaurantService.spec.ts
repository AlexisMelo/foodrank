import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import {
  autocompletePlaces,
  createRestaurantFromPlace,
  fetchMyRatings,
  fetchRecentRatings,
  fetchRestaurantById,
  rateRestaurant,
} from '@/services/restaurantService'

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

describe('fetchRestaurantById', () => {
  it('returns the restaurant and encodes the id in the url', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { id: 'a/b', name: 'Pizza Roma' } })

    const restaurant = await fetchRestaurantById('a/b')

    expect(restaurant?.name).toBe('Pizza Roma')
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/restaurants/a%2Fb')
  })

  it('returns undefined when the restaurant does not exist', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(404))

    expect(await fetchRestaurantById('unknown')).toBeUndefined()
  })

  it('rethrows other errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(503))

    await expect(fetchRestaurantById('r1')).rejects.toThrow()
  })
})

describe('autocompletePlaces', () => {
  it('sends the user position', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })

    await autocompletePlaces('pizza', { lat: 49.18, lon: -0.37 })

    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/places/autocomplete', {
      params: { input: 'pizza', lat: 49.18, lon: -0.37 },
    })
  })

  it('omits the position when unknown, so the API uses its default city', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })

    await autocompletePlaces('pizza', null)

    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/places/autocomplete', {
      params: { input: 'pizza', lat: undefined, lon: undefined },
    })
  })
})

describe('createRestaurantFromPlace', () => {
  it('posts the place id and returns the restaurant', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'r1' } })

    const restaurant = await createRestaurantFromPlace('N42')

    expect(restaurant.id).toBe('r1')
    expect(axios.post).toHaveBeenCalledWith('http://api.test/api/restaurants/from-place', {
      placeId: 'N42',
    })
  })
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
