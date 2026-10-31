/**
 * Lowest score of a criterion, same as the API (Rating.MinScore)
 */
export const MIN_SCORE = 1;

/**
 * Highest score of a criterion, same as the API (Rating.MaxScore)
 */
export const MAX_SCORE = 10;

/**
 * The three criteria of a rating, each a whole number from 1 to 10.
 */
interface RatingCriteria {
  /**
   * 1 to 10
   */
  food: number;

  /**
   * 1 to 10
   */
  service: number;

  /**
   * Setting (decor), 1 to 10
   */
  setting: number;
}

/**
 * A computed score (an average) rounded to one decimal, as it is displayed, e.g. 7.3
 */
export function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

/**
 * A computed score (an average) as displayed: rounded to one decimal, written only when it is not 0, e.g. "7.3", "8",
 * "10"
 */
export function formatScore(score: number): string {
  return String(roundScore(score));
}

/**
 * Average of the three criteria, rounded to one decimal (the "instant crush" bonus is not included)
 */
export function ratingAverage({ food, service, setting }: RatingCriteria): number {
  return roundScore((food + service + setting) / 3);
}

/**
 * Color of a 1-10 score: green when great (from 8.5), yellow when good (from 6.5), red otherwise
 */
export function scoreColor(score: number): string {
  if (score >= 8.5) return '#90be6d';
  if (score >= 6.5) return '#f9c74f';
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
