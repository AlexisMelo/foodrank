import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import type { Tierlist } from '@/types/tierlist'
import {
  createTierlist,
  fetchPinnedTierlistsByUserId,
  fetchTierlistById,
  fetchTierlistsByUserId,
} from '@/services/tierlistService'

// Keep axios' real helpers (isAxiosError...) but intercept the HTTP calls
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, get: vi.fn(), post: vi.fn() } }
})

/**
 * Builds a tierlist of the API.
 */
function tierlist(id: number, pinned = false): Tierlist {
  return {
    id,
    userId: 'u1',
    name: `Tierlist ${id}`,
    description: null,
    emoji: '🏆',
    restaurants: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned,
  }
}

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

describe('createTierlist', () => {
  it('posts the tierlist with the session cookie', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
    const tierlist = { emoji: '🍕', name: 'Best pizzas', description: null, pinned: true }

    await createTierlist(tierlist)

    expect(axios.post).toHaveBeenCalledWith('http://api.test/api/tierlists', tierlist, {
      withCredentials: true,
    })
  })

  it('rethrows API errors so the page can explain them', async () => {
    vi.mocked(axios.post).mockRejectedValue(httpError(401))

    await expect(
      createTierlist({ emoji: '🏆', name: 'Top 10', description: null, pinned: false }),
    ).rejects.toThrow('HTTP error')
  })
})

describe('fetchTierlistsByUserId', () => {
  it("gets the logged-in user's tierlists by default, with the session cookie", async () => {
    const tierlists = [tierlist(2), tierlist(1)]
    vi.mocked(axios.get).mockResolvedValue({ data: tierlists })

    expect(await fetchTierlistsByUserId()).toEqual(tierlists)
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/me/tierlists', {
      withCredentials: true,
    })
  })

  it('gets the tierlists of another user, encoding its id', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })

    await fetchTierlistsByUserId('a/b')

    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/a%2Fb/tierlists', {
      withCredentials: true,
    })
  })
})

describe('fetchTierlistById', () => {
  it('gets the tierlist with the session cookie', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: tierlist(7) })

    expect(await fetchTierlistById('7')).toEqual(tierlist(7))
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/tierlists/7', {
      withCredentials: true,
    })
  })

  it('returns undefined for an unknown tierlist', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(404))

    expect(await fetchTierlistById('42')).toBeUndefined()
  })

  it('rethrows the other API errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(503))

    await expect(fetchTierlistById('7')).rejects.toThrow('HTTP error')
  })
})

describe('fetchPinnedTierlistsByUserId', () => {
  it('keeps only the pinned tierlists of the user', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [tierlist(3, true), tierlist(2), tierlist(1, true)],
    })

    const pinned = await fetchPinnedTierlistsByUserId('u1')

    expect(pinned.map((t) => t.id)).toEqual([3, 1])
    expect(axios.get).toHaveBeenCalledWith('http://api.test/api/users/u1/tierlists', {
      withCredentials: true,
    })
  })
})
