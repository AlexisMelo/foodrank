import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { UserRating } from '@/types/rating'
import { useProfileRanking } from '@/composables/useProfileRanking'
import { fetchUserRatings } from '@/services/ratingService'

vi.mock('@/services/ratingService', () => ({ fetchUserRatings: vi.fn() }))
vi.mock('@/services/userService', () => ({ ME: 'me' }))

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number, isActive = true): UserRating {
  return {
    restaurantId,
    restaurantName: restaurantId,
    restaurantEmoji: '🍽️',
    restaurantCuisine: '',
    date: '2026-03-07',
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useProfileRanking', () => {
  it("ranks the logged-in user's restaurants without loading anything else", async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue([rating('ok', 60), rating('top', 90)])

    const { rankedRestaurants, isOwnProfile, loading } = useProfileRanking()
    await flushPromises()

    expect(fetchUserRatings).toHaveBeenCalledOnce()
    expect(fetchUserRatings).toHaveBeenCalledWith('me')
    expect(isOwnProfile.value).toBe(true)
    expect(rankedRestaurants.value.map((r) => r.restaurantId)).toEqual(['top', 'ok'])
    expect(rankedRestaurants.value.every((r) => r.myScore === undefined)).toBe(true)
    expect(loading.value).toBe(false)
  })

  it("on another user's profile, adds the logged-in user's own score of each restaurant", async () => {
    vi.mocked(fetchUserRatings).mockImplementation(async (id) =>
      id === 'me'
        ? [rating('both', 40), rating('both', 100, false)]
        : [rating('both', 80), rating('only-them', 70), rating('both', 10, false)],
    )

    const { rankedRestaurants, isOwnProfile } = useProfileRanking('u2')
    await flushPromises()

    expect(isOwnProfile.value).toBe(false)
    expect(rankedRestaurants.value).toMatchObject([
      { restaurantId: 'both', overall: 80, myScore: 40 },
      { restaurantId: 'only-them', overall: 70, myScore: undefined },
    ])
  })

  it('reports an error and ranks nothing when the API fails', async () => {
    vi.mocked(fetchUserRatings).mockRejectedValue(new Error('503'))

    const { rankedRestaurants, loadError } = useProfileRanking()
    await flushPromises()

    expect(loadError.value).toBe(true)
    expect(rankedRestaurants.value).toEqual([])
  })
})
