import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { UserRating } from '@/types/rating'
import { useMyRecentRatings } from '@/composables/useMyRecentRatings'
import { fetchUserRatings } from '@/services/ratingService'

vi.mock('@/services/ratingService', () => ({ fetchUserRatings: vi.fn() }))
vi.mock('@/services/userService', () => ({ ME: 'me' }))

/**
 * Builds a rating of `restaurantId` given on `date`.
 */
function rating(restaurantId: string, date: string): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date,
    food: 80,
    service: 70,
    setting: 60,
    bonus: false,
    isActive: true,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useMyRecentRatings', () => {
  it("keeps the logged-in user's first ratings, in the API order (most recent first)", async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue([
      rating('r1', '2026-10-08'),
      rating('r2', '2026-10-07'),
      rating('r3', '2026-10-06'),
    ])

    const { ratings, loading, loadError } = useMyRecentRatings(2)
    expect(loading.value).toBe(true)
    await flushPromises()

    expect(fetchUserRatings).toHaveBeenCalledWith('me')
    expect(ratings.value.map((r) => r.restaurantId)).toEqual(['r1', 'r2'])
    expect(loading.value).toBe(false)
    expect(loadError.value).toBe(false)
  })

  it('keeps 5 ratings by default', async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => rating(`r${i}`, '2026-10-08')),
    )

    const { ratings } = useMyRecentRatings()
    await flushPromises()

    expect(ratings.value).toHaveLength(5)
  })

  it('reports an error when the API fails', async () => {
    vi.mocked(fetchUserRatings).mockRejectedValue(new Error('503'))

    const { ratings, loading, loadError } = useMyRecentRatings()
    await flushPromises()

    expect(ratings.value).toEqual([])
    expect(loadError.value).toBe(true)
    expect(loading.value).toBe(false)
  })
})
