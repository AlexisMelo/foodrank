/**
 * The three criteria of a rating, each from 0 to 100.
 */
interface RatingCriteria {
  /**
   * 0 to 100
   */
  food: number;

  /**
   * 0 to 100
   */
  service: number;

  /**
   * Setting (decor), 0 to 100
   */
  setting: number;
}

/**
 * Average of the three criteria, rounded to an integer (the "instant crush" bonus is not included)
 */
export function ratingAverage({ food, service, setting }: RatingCriteria): number {
  return Math.round((food + service + setting) / 3);
}

/**
 * Color of a 0-100 score: green when great, yellow when good, red otherwise
 */
export function scoreColor(score: number): string {
  if (score >= 85) return '#90be6d';
  if (score >= 65) return '#f9c74f';
  return '#ff6b6b';
}

/**
 * Formats the moment of a rating (ISO 8601, with its time zone) as its day in the browser's time zone,
 * e.g. "March 7, 2026"
 * @param format parts to display, e.g. `{ month: 'short', day: 'numeric' }` for "Mar 7"
 */
export function formatRatingDate(
  date: string,
  format: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  return new Date(date).toLocaleDateString('en-US', format);
}
