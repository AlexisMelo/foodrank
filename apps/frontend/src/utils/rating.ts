/** The three criteria of a rating, each from 0 to 100. */
interface RatingCriteria {
  food: number
  service: number
  setting: number
}

/**
 * Average of the three criteria, rounded to an integer (the "instant crush" bonus is not included)
 */
export function ratingAverage({ food, service, setting }: RatingCriteria): number {
  return Math.round((food + service + setting) / 3)
}

/**
 * Color of a 0-100 score: green when great, yellow when good, red otherwise
 */
export function scoreColor(score: number): string {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}

/**
 * Formats a rating day ("yyyy-MM-dd") for display, e.g. "March 7, 2026".
 * The day is read in local time: `new Date('2026-03-07')` would be UTC midnight, displayed as the day before
 * in time zones behind UTC.
 */
export function formatRatingDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
