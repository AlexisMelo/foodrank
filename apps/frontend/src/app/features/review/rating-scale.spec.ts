import {
  type PastReview,
  markerLeft,
  pickMarkers,
  ratingLabel,
  sliderColor,
  sliderGradient,
} from './rating-scale';

/**
 * Builds the past review `id` with a food score of `food`.
 */
function review(id: string, food: number): PastReview {
  return { id, food, service: 1, decor: 1 };
}

describe('rating scale', () => {
  it('names each of the 10 scores with the word of the threshold it reached', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ratingLabel)).toEqual([
      'Awful',
      'Okay',
      'Okay',
      'Good',
      'Good',
      'Good',
      'Great !',
      'Great !',
      'Amazing !',
      'Amazing !',
    ]);
  });

  it('colors a score from red at 1 to green at 10, and fills the track up to it', () => {
    expect(sliderColor(1)).toBe('rgb(220, 0, 40)');
    expect(sliderColor(5)).toBe('rgb(220, 178, 40)');
    expect(sliderColor(10)).toBe('rgb(40, 200, 40)');
    expect(sliderColor(5, 0.2)).toBe('rgba(220, 178, 40, 0.2)');
    expect(sliderGradient(4)).toBe(
      'linear-gradient(to right, rgb(220, 133, 40) 0%, rgb(220, 133, 40) 33%, rgba(255,255,255,0.1) 33%, rgba(255,255,255,0.1) 100%)',
    );
    expect(sliderGradient(1)).toContain('rgb(220, 0, 40) 0%, rgba(255,255,255,0.1) 0%');
    expect(sliderGradient(10)).toContain('rgb(40, 200, 40) 100%, rgba(255,255,255,0.1) 100%');
  });

  it('places a marker under the center of the thumb, 1 at the left end and 10 at the right end', () => {
    expect(markerLeft(1)).toBe('calc(0 * (100% - 22px) + 11px)');
    expect(markerLeft(4)).toBe(`calc(${1 / 3} * (100% - 22px) + 11px)`);
    expect(markerLeft(10)).toBe('calc(1 * (100% - 22px) + 11px)');
  });

  it('shows the past review closest to each target, ignoring the far ones', () => {
    const reviews = [
      review('a', 4),
      review('b', 3),
      review('c', 6),
      review('d', 10),
      review('e', 2),
    ];

    // 3 → b (on it, before a and e), 5.5 → c (0.5 away), 8 → none within 1 (d is 2 away)
    expect(pickMarkers(reviews, 'food').map((v) => v.id)).toEqual(['b', 'c']);
  });

  it('reads the score of the criterion asked, in the order of the targets', () => {
    const reviews = [
      { ...review('a', 5), decor: 8 },
      { ...review('b', 8), decor: 3 },
    ];

    // Decor: 3 → b, 8 → a; food would give 5.5 → a, 8 → b
    expect(pickMarkers(reviews, 'decor').map((v) => v.id)).toEqual(['b', 'a']);
    expect(pickMarkers(reviews, 'food').map((v) => v.id)).toEqual(['a', 'b']);
  });
});
