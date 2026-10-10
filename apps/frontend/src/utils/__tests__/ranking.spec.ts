import { describe, it, expect } from 'vitest'
import type { UserRating } from '@/types/rating'
import { overallByRestaurant, rankRestaurants, rankTierlistRestaurants } from '@/utils/ranking'
import { restaurantCountLabel } from '@/utils/profile'

/**
 * Builds a rating of `restaurantId` with the given scores.
 */
function rating(restaurantId: string, food: number, service: number, setting: number): UserRating {
  return {
    restaurantId,
    restaurantName: `Name ${restaurantId}`,
    restaurantEmoji: '🍽️',
    restaurantCuisine: 'Italian',
    date: '2026-03-07',
    food,
    service,
    setting,
    bonus: false,
  }
}

describe('rankRestaurants', () => {
  it('ranks the restaurants by the average of the three criteria, best first', () => {
    const ranked = rankRestaurants([
      rating('meh', 50, 50, 50),
      rating('great', 90, 90, 90),
      rating('good', 70, 70, 70),
    ])

    expect(ranked.map((r) => r.restaurantId)).toEqual(['great', 'good', 'meh'])
    expect(ranked[0]).toMatchObject({ name: 'Name great', emoji: '🍽️', cuisine: 'Italian' })
  })

  it('lists a restaurant rated several times once, with the average of its ratings', () => {
    const ranked = rankRestaurants([
      rating('r1', 80, 60, 40),
      rating('r1', 60, 40, 20),
      rating('r2', 10, 10, 10),
    ])

    expect(ranked).toHaveLength(2)
    expect(ranked[0]).toMatchObject({ restaurantId: 'r1', food: 70, service: 50, setting: 30 })
    expect(ranked[0]!.overall).toBe(50)
  })

  it('returns nothing without rating', () => {
    expect(rankRestaurants([])).toEqual([])
  })
})

describe('overallByRestaurant', () => {
  it("gives the user's average score of each restaurant", () => {
    const scores = overallByRestaurant([rating('r1', 90, 60, 30), rating('r1', 30, 30, 30)])

    expect(scores.get('r1')).toBe(45)
    expect(scores.has('r2')).toBe(false)
  })
})

describe('restaurantCountLabel', () => {
  it('uses the singular only for one restaurant', () => {
    expect(restaurantCountLabel(0)).toBe('0 restaurants')
    expect(restaurantCountLabel(1)).toBe('1 restaurant')
    expect(restaurantCountLabel(12)).toBe('12 restaurants')
  })
})

describe('rankTierlistRestaurants', () => {
  it("ranks the tierlist's restaurants by the owner's averages, ignoring the other restaurants rated", () => {
    const ranked = rankTierlistRestaurants(
      ['meh', 'great'],
      [rating('meh', 40, 40, 40), rating('great', 90, 90, 90), rating('other', 100, 100, 100)],
    )

    expect(ranked.map((r) => [r.restaurantId, r.overall])).toEqual([
      ['great', 90],
      ['meh', 40],
    ])
  })

  it('never lists a restaurant the owner did not rate, rather than giving it a made-up score', () => {
    const ranked = rankTierlistRestaurants(['unrated', 'rated'], [rating('rated', 20, 20, 20)])

    expect(ranked.map((r) => r.restaurantId)).toEqual(['rated'])
  })
})
