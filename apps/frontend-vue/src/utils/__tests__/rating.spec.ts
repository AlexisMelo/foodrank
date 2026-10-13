import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRatingDate, ratingAverage, scoreColor } from '@/utils/rating'

describe('ratingAverage', () => {
  it('averages the three criteria and rounds the result', () => {
    expect(ratingAverage({ food: 80, service: 61, setting: 40 })).toBe(60)
    expect(ratingAverage({ food: 90.5, service: 90, setting: 91 })).toBe(91)
  })
})

describe('scoreColor', () => {
  it('is green from 85, yellow from 65, red below', () => {
    expect(scoreColor(85)).toBe('#90be6d')
    expect(scoreColor(84)).toBe('#f9c74f')
    expect(scoreColor(65)).toBe('#f9c74f')
    expect(scoreColor(64)).toBe('#ff6b6b')
  })
})

describe('formatRatingDate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('displays the day of the rating', () => {
    expect(formatRatingDate('2026-03-07')).toBe('March 7, 2026')
  })

  it('keeps the same day in time zones behind UTC', () => {
    // Read as UTC midnight, '2026-03-07' would be March 6 in New York
    vi.stubEnv('TZ', 'America/New_York')

    expect(formatRatingDate('2026-03-07')).toBe('March 7, 2026')
  })

  it('displays only the requested parts', () => {
    vi.stubEnv('TZ', 'America/New_York')

    expect(formatRatingDate('2026-03-07', { month: 'short', day: 'numeric' })).toBe('Mar 7')
  })
})
