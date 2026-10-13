import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import {
  autocompletePlaces,
  createRestaurantFromPlace,
  fetchRestaurantById,
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
