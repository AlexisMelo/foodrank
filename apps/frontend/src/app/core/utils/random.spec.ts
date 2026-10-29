import { pickRandom } from './random';

/**
 * Source of random numbers giving `values` in turn, then 0
 */
function sequence(...values: number[]): () => number {
  return () => values.shift() ?? 0;
}

describe('pickRandom', () => {
  /**
   * List picked from, more items than the tests ask for
   */
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('picks the number of items asked for, each one at most once, among the list', () => {
    const picked = pickRandom(items, 5);

    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    expect(picked.every((item) => items.includes(item))).toBe(true);
  });

  it('picks the item at the random position among the ones left, each time', () => {
    // 0.99 → last of the 7 items (g); 0 → first of the 6 left (b, as a moved to g's place); 0.5 → 3rd of the 5 left
    expect(pickRandom(items, 3, sequence(0.99, 0, 0.5))).toEqual(['g', 'b', 'e']);
  });

  it('gives every item when there are fewer than asked for, and none for an empty list', () => {
    expect(pickRandom(['a', 'b'], 5).sort()).toEqual(['a', 'b']);
    expect(pickRandom([], 5)).toEqual([]);
    expect(pickRandom(items, 0)).toEqual([]);
  });

  it('does not change the list given', () => {
    pickRandom(items, 5);

    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });
});
