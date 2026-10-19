/**
 * A word shown on the rating scale, from the score it starts at.
 */
export interface ThresholdMarker {
  /**
   * Lowest score of the word, 0 to 100
   */
  value: number;

  /**
   * Word shown, e.g. "Good"
   */
  label: string;
}

/**
 * Words of the rating scale, by increasing score: the chip of a criterion shows the one of its score, and the
 * slider marks where each one starts (except "Awful", at 0)
 */
export const THRESHOLD_MARKERS: readonly ThresholdMarker[] = [
  { value: 0, label: 'Awful' },
  { value: 10, label: 'Okay' },
  { value: 35, label: 'Good' },
  { value: 65, label: 'Great !' },
  { value: 90, label: 'Amazing !' },
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
   * 0 to 100
   */
  food: number;

  /**
   * 0 to 100
   */
  service: number;

  /**
   * Setting, 0 to 100 (named setting in the API ratings)
   */
  decor: number;
}

/**
 * Scores (0 to 100) around which a past review of the user is shown on the slider, at most one per target
 */
const MARKER_TARGETS = [22, 50, 78];

/**
 * Largest gap between a review's score and a target for the review to be shown at that target
 */
const MARKER_TOLERANCE = 10;

/**
 * Color of a score: red at 0, orange-yellow at 50, green at 100, as `rgb(r, g, b)`, or `rgba(r, g, b, alpha)` when
 * an opacity is given.
 * @param alpha opacity, 0 to 1; opaque when omitted
 */
export function sliderColor(value: number, alpha?: number): string {
  const pct = value / 100;
  const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 180);
  const g = pct < 0.5 ? Math.round(pct * 2 * 200) : Math.min(200, Math.round(100 + pct * 120));
  return alpha === undefined ? `rgb(${r}, ${g}, 40)` : `rgba(${r}, ${g}, 40, ${alpha})`;
}

/**
 * Background of a slider track: filled with the score's color up to the score, grey after.
 */
export function sliderGradient(value: number): string {
  const color = sliderColor(value);
  return `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`;
}

/**
 * Word of the rating scale matching a score, e.g. "Good" from 35 to 64.
 */
export function ratingLabel(value: number): string {
  const match = [...THRESHOLD_MARKERS].reverse().find((t) => value >= t.value);
  return match?.label ?? THRESHOLD_MARKERS[0]!.label;
}

/**
 * Position a marker on the slider track, accounting for the 22px thumb offset
 */
export function markerLeft(value: number): string {
  return `calc(${value / 100} * (100% - 22px) + 11px)`;
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
