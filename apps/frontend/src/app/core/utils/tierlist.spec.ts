import { HttpErrorResponse } from '@angular/common/http';
import type { Tierlist } from '@/core/models/tierlist.model';
import {
  addToTierlistErrorMessage,
  byLastUpdate,
  containsRestaurant,
  isAlreadyInTierlist,
  toggleId,
  withAddedRestaurant,
} from './tierlist';

/**
 * Builds the tierlist `id` named `name`, last updated at `updatedAt`, holding `restaurantIds`.
 */
function tierlist(
  id: number,
  name: string,
  updatedAt = '2026-10-01T10:00:00Z',
  restaurantIds: string[] = [],
): Tierlist {
  return {
    id,
    userId: 'u1',
    name,
    description: null,
    emoji: '🏆',
    restaurants: restaurantIds.map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt,
    pinned: false,
  };
}

describe('byLastUpdate', () => {
  it('sorts a copy of the tierlists, the most recently updated first', () => {
    const tierlists = [
      tierlist(1, 'Old', '2026-01-01T10:00:00Z'),
      tierlist(2, 'Newest', '2026-10-20T10:00:00Z'),
      tierlist(3, 'Middle', '2026-05-01T10:00:00Z'),
    ];

    expect(byLastUpdate(tierlists).map((t) => t.id)).toEqual([2, 3, 1]);
    expect(tierlists.map((t) => t.id)).toEqual([1, 2, 3]);
  });
});

describe('toggleId', () => {
  it('adds an id that is not selected at the end, and removes one that is', () => {
    expect(toggleId([3, 1], 2)).toEqual([3, 1, 2]);
    expect(toggleId([3, 1, 2], 1)).toEqual([3, 2]);
  });
});

describe('containsRestaurant', () => {
  it('tells whether the restaurant is one of the restaurants of the tierlist', () => {
    const top = tierlist(1, 'Top 10', undefined, ['r1', 'r2']);

    expect(containsRestaurant(top, 'r2')).toBe(true);
    expect(containsRestaurant(top, 'r3')).toBe(false);
  });
});

describe('withAddedRestaurant', () => {
  it("adds the restaurant's entry answered by the API at the end, with the answer's last update", () => {
    const shown = tierlist(1, 'Top 10', '2026-10-01T10:00:00Z', ['r1']);
    const saved = {
      ...tierlist(1, 'Top 10', '2026-10-25T10:00:00Z'),
      restaurants: [
        { restaurantId: 'r1', addedAt: null },
        { restaurantId: 'r2', addedAt: '2026-10-25T10:00:00Z' },
      ],
    };

    const merged = withAddedRestaurant(shown, saved, 'r2');

    expect(merged.restaurants).toEqual([
      { restaurantId: 'r1', addedAt: null },
      { restaurantId: 'r2', addedAt: '2026-10-25T10:00:00Z' },
    ]);
    expect(merged.updatedAt).toBe('2026-10-25T10:00:00Z');
  });

  it('keeps the restaurants added meanwhile, which an answer of two additions sent together misses', () => {
    // r2 then r3 sent together: the API read the tierlist before either was added, and answers each without the other
    const empty = tierlist(1, 'Top 10', '2026-10-01T10:00:00Z');
    const savedR2 = tierlist(1, 'Top 10', '2026-10-25T10:00:00Z', ['r2']);
    const savedR3 = tierlist(1, 'Top 10', '2026-10-25T10:00:01Z', ['r3']);

    const merged = withAddedRestaurant(withAddedRestaurant(empty, savedR3, 'r3'), savedR2, 'r2');

    expect(merged.restaurants.map((e) => e.restaurantId)).toEqual(['r3', 'r2']);
    // The answer received last is the older one
    expect(merged.updatedAt).toBe('2026-10-25T10:00:01Z');
  });

  it('leaves the tierlist unchanged when it already holds the restaurant', () => {
    const shown = tierlist(1, 'Top 10', undefined, ['r1']);

    expect(withAddedRestaurant(shown, tierlist(1, 'Top 10', undefined, ['r1']), 'r1')).toBe(shown);
  });
});

describe('addToTierlistErrorMessage', () => {
  it('tells the restaurant is already in the tierlist when the API answers 409', () => {
    const conflict = new HttpErrorResponse({ status: 409 });

    expect(isAlreadyInTierlist(conflict)).toBe(true);
    expect(addToTierlistErrorMessage(conflict, 'Pizza Roma', 'Top 10')).toBe(
      'Pizza Roma is already in Top 10.',
    );
  });

  it('asks to try again for any other error', () => {
    const unavailable = new HttpErrorResponse({ status: 503 });

    expect(isAlreadyInTierlist(unavailable)).toBe(false);
    expect(addToTierlistErrorMessage(unavailable, 'Pizza Roma', 'Top 10')).toBe(
      "Couldn't add Pizza Roma to Top 10, try again.",
    );
  });
});
