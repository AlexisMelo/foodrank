import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import { createTierlist } from '@/services/tierlistService'

// Keep axios' real helpers (isAxiosError...) but intercept the HTTP calls
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, post: vi.fn() } }
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
