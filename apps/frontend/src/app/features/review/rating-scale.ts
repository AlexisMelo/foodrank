import { MAX_SCORE, MIN_SCORE } from '@/core/utils/rating';

/**
 * A word shown on the rating scale, from the score it starts at.
 */
export interface ThresholdMarker {
  /**
   * Lowest score of the word, 1 to 10
   */
  value: number;

  /**
   * Word shown, e.g. "Good"
   */
  label: string;
}

/**
 * Words of the rating scale, by increasing score: the chip of a criterion shows the one of its score, and the
 * slider marks where each one starts (except "Awful", at 1)
 */
export const THRESHOLD_MARKERS: readonly ThresholdMarker[] = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 7, label: 'Great !' },
  { value: 9, label: 'Amazing !' },
];

/**
 * A past review of the user, shown as a landmark under the sliders.
 */
export interface PastReview {
  /**
   * Unique among the reviews shown
   */
  id: string;

  /**
   * 1 to 10
   */
  food: number;

  /**
   * 1 to 10
   */
  service: number;

  /**
   * Setting, 1 to 10 (named setting in the API ratings)
   */
  decor: number;
}

/**
 * Scores (1 to 10) around which a past review of the user is shown on the slider, at most one per target: the left,
 * the middle and the right of the slider
 */
const MARKER_TARGETS = [3, 5.5, 8];

/**
 * Largest gap between a review's score and a target for the review to be shown at that target: 2 to 4, 5 to 6, 7 to 9
 */
const MARKER_TOLERANCE = 1;

/**
 * Position of a score along the slider, from 0 (MIN_SCORE, left end) to 1 (MAX_SCORE, right end)
 */
function scaleFraction(value: number): number {
  return (value - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
}

/**
 * Color of a score: red at 1, orange-yellow in the middle, green at 10, as `rgb(r, g, b)`, or `rgba(r, g, b, alpha)`
 * when an opacity is given.
 * @param alpha opacity, 0 to 1; opaque when omitted
 */
export function sliderColor(value: number, alpha?: number): string {
  const pct = scaleFraction(value);
  const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 180);
  const g = pct < 0.5 ? Math.round(pct * 2 * 200) : Math.min(200, Math.round(100 + pct * 120));
  return alpha === undefined ? `rgb(${r}, ${g}, 40)` : `rgba(${r}, ${g}, 40, ${alpha})`;
}

/**
 * Background of a slider track: filled with the score's color up to the score, grey after.
 */
export function sliderGradient(value: number): string {
  const color = sliderColor(value);
  const filled = Math.round(scaleFraction(value) * 100);
  return `linear-gradient(to right, ${color} 0%, ${color} ${filled}%, rgba(255,255,255,0.1) ${filled}%, rgba(255,255,255,0.1) 100%)`;
}

/**
 * Word of the rating scale matching a score, e.g. "Good" from 4 to 6.
 */
export function ratingLabel(value: number): string {
  const match = [...THRESHOLD_MARKERS].reverse().find((t) => value >= t.value);
  return match?.label ?? THRESHOLD_MARKERS[0]!.label;
}

/**
 * Position a marker on the slider track, accounting for the 22px thumb offset
 */
export function markerLeft(value: number): string {
  return `calc(${scaleFraction(value)} * (100% - 22px) + 11px)`;
}

/**
 * Past reviews of the user to show on the slider of a criterion, as landmarks: for each target score, the review
 * closest to it (within MARKER_TOLERANCE), each review shown once at most. In the order of the targets.
 */
export function pickMarkers<T extends PastReview>(
  reviews: readonly T[],
  key: 'food' | 'service' | 'decor',
): T[] {
  const used = new Set<string>();
  return MARKER_TARGETS.map((target) => {
    const best = reviews
      .filter((v) => !used.has(v.id) && Math.abs(v[key] - target) <= MARKER_TOLERANCE)
      .sort((a, b) => Math.abs(a[key] - target) - Math.abs(b[key] - target))[0];
    if (best) used.add(best.id);
    return best ?? null;
  }).filter((v): v is NonNullable<typeof v> => v !== null);
}
