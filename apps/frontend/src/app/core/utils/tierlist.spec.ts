import type { Tierlist } from '@/core/models/tierlist.model';
import { byLastUpdate, containsRestaurant, filterTierlistsByName, toggleId } from './tierlist';

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

describe('filterTierlistsByName', () => {
  /**
   * Tierlists searched, one with accents in its name
   */
  const tierlists = [
    tierlist(1, 'Crêpes du dimanche'),
    tierlist(2, 'Top 10'),
    tierlist(3, 'Date night'),
  ];

  it('keeps the tierlists whose name contains the query, whatever its case and accents, in the same order', () => {
    expect(filterTierlistsByName(tierlists, 'CREPE').map((t) => t.id)).toEqual([1]);
    expect(filterTierlistsByName(tierlists, 'dimanche').map((t) => t.id)).toEqual([1]);
    expect(filterTierlistsByName(tierlists, 'T').map((t) => t.id)).toEqual([2, 3]);
  });

  it('keeps every tierlist for a blank query, ignoring the spaces around a query', () => {
    expect(filterTierlistsByName(tierlists, '   ').map((t) => t.id)).toEqual([1, 2, 3]);
    expect(filterTierlistsByName(tierlists, '  top ').map((t) => t.id)).toEqual([2]);
  });

  it('keeps nothing when no name matches', () => {
    expect(filterTierlistsByName(tierlists, 'sushi')).toEqual([]);
  });
});

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
