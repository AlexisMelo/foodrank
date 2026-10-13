import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import type { RatingSummary, RestaurantRating } from '@/types/rating'
import { useRestaurantRatings } from '@/composables/useRestaurantRatings'
import { fetchMyRatings, fetchRatingSummary, fetchRecentRatings } from '@/services/ratingService'

vi.mock('@/services/ratingService', () => ({
  fetchRecentRatings: vi.fn(),
  fetchMyRatings: vi.fn(),
  fetchRatingSummary: vi.fn(),
}))

/** Averages of 2 ratings */
const SUMMARY: RatingSummary = { count: 2, food: 80, service: 70, setting: 60, global: 70 }

/**
 * Builds a rating of `restaurantId` by `userId`.
 */
function rating(restaurantId: string, userId: string, date = '2026-03-07'): RestaurantRating {
  return {
    restaurantId,
    userId,
    date,
    food: 80,
    service: 70,
    setting: 60,
    bonus: false,
    isActive: true,
    userName: userId,
    userAvatarUrl: null,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useRestaurantRatings', () => {
  it("loads the 5 most recent ratings, the user's own ratings and the averages of the restaurant", async () => {
    vi.mocked(fetchRecentRatings).mockResolvedValue([rating('r1', 'camille'), rating('r1', 'me')])
    vi.mocked(fetchMyRatings).mockResolvedValue([rating('r1', 'me')])
    vi.mocked(fetchRatingSummary).mockResolvedValue(SUMMARY)

    const { recentRatings, myRatings, summary, loading, loadError } = useRestaurantRatings('r1')
    expect(loading.value).toBe(true)
    await flushPromises()

    expect(fetchRecentRatings).toHaveBeenCalledWith('r1', 5)
    expect(fetchMyRatings).toHaveBeenCalledWith('r1')
    expect(fetchRatingSummary).toHaveBeenCalledWith('r1')
    expect(recentRatings.value.map((r) => r.userId)).toEqual(['camille', 'me'])
    expect(myRatings.value.map((r) => r.userId)).toEqual(['me'])
    expect(summary.value).toEqual(SUMMARY)
    expect(loading.value).toBe(false)
    expect(loadError.value).toBe(false)
  })

  it('loads nothing while the restaurant is unknown', async () => {
    const { recentRatings, myRatings, summary, loading } = useRestaurantRatings(null)
    await flushPromises()

    expect(fetchRecentRatings).not.toHaveBeenCalled()
    expect(fetchMyRatings).not.toHaveBeenCalled()
    expect(fetchRatingSummary).not.toHaveBeenCalled()
    expect(recentRatings.value).toEqual([])
    expect(myRatings.value).toEqual([])
    expect(summary.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('reports an error when the API fails', async () => {
    vi.mocked(fetchRecentRatings).mockRejectedValue(new Error('503'))
    vi.mocked(fetchMyRatings).mockResolvedValue([])

    const { loading, loadError } = useRestaurantRatings('r1')
    await flushPromises()

    expect(loadError.value).toBe(true)
    expect(loading.value).toBe(false)
  })

  it('reports an error when the averages cannot be loaded', async () => {
    vi.mocked(fetchRecentRatings).mockResolvedValue([])
    vi.mocked(fetchMyRatings).mockResolvedValue([])
    vi.mocked(fetchRatingSummary).mockRejectedValue(new Error('503'))

    const { summary, loadError } = useRestaurantRatings('r1')
    await flushPromises()

    expect(loadError.value).toBe(true)
    expect(summary.value).toBeNull()
  })

  it('reloads the ratings and averages when the restaurant changes', async () => {
    vi.mocked(fetchRecentRatings).mockImplementation(async (id) => [rating(id, 'camille')])
    vi.mocked(fetchMyRatings).mockResolvedValue([])
    vi.mocked(fetchRatingSummary)
      .mockResolvedValueOnce(SUMMARY)
      .mockResolvedValueOnce({ ...SUMMARY, global: 42 })
    const restaurantId = shallowRef<string | null>('r1')

    const { recentRatings, summary } = useRestaurantRatings(restaurantId)
    await flushPromises()
    restaurantId.value = 'r2'
    await flushPromises()

    expect(recentRatings.value.map((r) => r.restaurantId)).toEqual(['r2'])
    expect(fetchRatingSummary).toHaveBeenLastCalledWith('r2')
    expect(summary.value?.global).toBe(42)
  })

  it('ignores the late answer of the previous restaurant', async () => {
    let resolveFirst!: (ratings: RestaurantRating[]) => void
    vi.mocked(fetchRecentRatings)
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([rating('r2', 'camille')])
    vi.mocked(fetchMyRatings).mockResolvedValue([])
    const restaurantId = shallowRef<string | null>('r1')

    const { recentRatings } = useRestaurantRatings(restaurantId)
    restaurantId.value = 'r2'
    await flushPromises()
    resolveFirst([rating('r1', 'old')])
    await flushPromises()

    expect(recentRatings.value.map((r) => r.restaurantId)).toEqual(['r2'])
  })
})
