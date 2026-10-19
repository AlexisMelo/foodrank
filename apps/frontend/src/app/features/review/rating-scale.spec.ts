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
  return { id, food, service: 0, decor: 0 };
}

describe('rating scale', () => {
  it('names a score with the word of the threshold it reached', () => {
    expect([0, 9, 10, 34, 35, 64, 65, 89, 90, 100].map(ratingLabel)).toEqual([
      'Awful',
      'Awful',
      'Okay',
      'Okay',
      'Good',
      'Good',
      'Great !',
      'Great !',
      'Amazing !',
      'Amazing !',
    ]);
  });

  it('colors a score from red to green, and fills the track up to it', () => {
    expect(sliderColor(0)).toBe('rgb(220, 0, 40)');
    expect(sliderColor(50)).toBe('rgb(220, 160, 40)');
    expect(sliderColor(100)).toBe('rgb(40, 200, 40)');
    expect(sliderColor(50, 0.2)).toBe('rgba(220, 160, 40, 0.2)');
    expect(sliderGradient(30)).toBe(
      'linear-gradient(to right, rgb(220, 120, 40) 0%, rgb(220, 120, 40) 30%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 100%)',
    );
  });

  it('places a marker under the center of the thumb', () => {
    expect(markerLeft(0)).toBe('calc(0 * (100% - 22px) + 11px)');
    expect(markerLeft(50)).toBe('calc(0.5 * (100% - 22px) + 11px)');
  });

  it('shows the past review closest to each target, ignoring the far ones', () => {
    const reviews = [
      review('a', 25),
      review('b', 21),
      review('c', 45),
      review('d', 95),
      review('e', 33),
    ];

    // 22 → b (1 away, before a), 50 → c (5 away), 78 → none within 10 (d is 17 away)
    expect(pickMarkers(reviews, 'food').map((v) => v.id)).toEqual(['b', 'c']);
  });

  it('reads the score of the criterion asked, in the order of the targets', () => {
    const reviews = [
      { ...review('a', 50), decor: 80 },
      { ...review('b', 80), decor: 20 },
    ];

    // Decor: 22 → b, 78 → a; food would give 50 → a, 78 → b
    expect(pickMarkers(reviews, 'decor').map((v) => v.id)).toEqual(['b', 'a']);
    expect(pickMarkers(reviews, 'food').map((v) => v.id)).toEqual(['a', 'b']);
  });
});
