import type { UserRating } from '@/core/models/rating.model';
import {
  type RankedRestaurant,
  overallByRestaurant,
  rankRestaurants,
  rankTierlistRestaurants,
  sortRestaurants,
} from './ranking';
import { restaurantCountLabel } from './profile';

/**
 * Builds a rating of `restaurantId` with the given scores.
 */
function rating(
  restaurantId: string,
  food: number,
  service: number,
  setting: number,
  isActive = true,
): UserRating {
  return {
    restaurantId,
    restaurantName: `Name ${restaurantId}`,
    restaurantEmoji: '🍽️',
    restaurantAddress: '1 rue de Caen',
    date: '2026-03-07T12:00:00+00:00',
    food,
    service,
    setting,
    bonus: false,
    isActive,
  };
}

describe('rankRestaurants', () => {
  it('ranks the restaurants by the score of their rating (mean of the three criteria), best first', () => {
    const ranked = rankRestaurants([
      rating('meh', 50, 50, 50),
      rating('great', 90, 90, 90),
      rating('good', 70, 70, 70),
    ]);

    expect(ranked.map((r) => r.restaurantId)).toEqual(['great', 'good', 'meh']);
    expect(ranked[0]).toMatchObject({
      name: 'Name great',
      emoji: '🍽️',
      address: '1 rue de Caen',
      ratedAt: '2026-03-07T12:00:00+00:00',
    });
  });

  it('lists a restaurant rated several times once, with its active rating only', () => {
    const ranked = rankRestaurants([
      rating('r1', 60, 40, 20),
      rating('r2', 10, 10, 10),
      rating('r1', 100, 100, 100, false),
    ]);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ restaurantId: 'r1', food: 60, service: 40, setting: 20 });
    expect(ranked[0]!.overall).toBe(40);
  });

  it('returns nothing without rating', () => {
    expect(rankRestaurants([])).toEqual([]);
  });
});

describe('sortRestaurants', () => {
  /**
   * Builds the restaurant `name` scored `overall`, rated at `ratedAt`.
   */
  function restaurant(name: string, overall: number, ratedAt: string): RankedRestaurant {
    return {
      restaurantId: name,
      name,
      emoji: '🍽️',
      address: '',
      food: overall,
      service: overall,
      setting: overall,
      overall,
      ratedAt,
    };
  }

  const restaurants = [
    restaurant('Sushi Bar', 60, '2026-10-01T12:00:00+00:00'),
    restaurant('Crêperie du Port', 90, '2026-09-01T12:00:00+00:00'),
    restaurant('Arepas', 60, '2026-10-20T12:00:00+00:00'),
  ];

  /**
   * Names of `restaurants` sorted in the order `sort`.
   */
  function sortedNames(sort: Parameters<typeof sortRestaurants>[1]): string[] {
    return sortRestaurants(restaurants, sort).map((r) => r.name);
  }

  it('sorts by score, best first, the restaurants scored the same keeping their order', () => {
    expect(sortedNames('score')).toEqual(['Crêperie du Port', 'Sushi Bar', 'Arepas']);
  });

  it('sorts by the moment of the rating, the most recent first', () => {
    expect(sortedNames('recent')).toEqual(['Arepas', 'Sushi Bar', 'Crêperie du Port']);
  });

  it('sorts by name', () => {
    expect(sortedNames('az')).toEqual(['Arepas', 'Crêperie du Port', 'Sushi Bar']);
  });

  it('leaves the list given unchanged', () => {
    sortRestaurants(restaurants, 'az');

    expect(restaurants.map((r) => r.name)).toEqual(['Sushi Bar', 'Crêperie du Port', 'Arepas']);
  });
});

describe('overallByRestaurant', () => {
  it("gives the score of the user's active rating of each restaurant", () => {
    const scores = overallByRestaurant([rating('r1', 30, 30, 30), rating('r1', 90, 60, 30, false)]);

    expect(scores.get('r1')).toBe(30);
    expect(scores.has('r2')).toBe(false);
  });
});

describe('restaurantCountLabel', () => {
  it('uses the singular only for one restaurant', () => {
    expect(restaurantCountLabel(0)).toBe('0 restaurants');
    expect(restaurantCountLabel(1)).toBe('1 restaurant');
    expect(restaurantCountLabel(12)).toBe('12 restaurants');
  });
});

describe('rankTierlistRestaurants', () => {
  it("ranks the tierlist's restaurants by the owner's active ratings, ignoring the other restaurants rated", () => {
    const ranked = rankTierlistRestaurants(
      ['meh', 'great'],
      [
        rating('meh', 40, 40, 40),
        rating('great', 90, 90, 90),
        rating('meh', 100, 100, 100, false),
        rating('other', 100, 100, 100),
      ],
    );

    expect(ranked.map((r) => [r.restaurantId, r.overall])).toEqual([
      ['great', 90],
      ['meh', 40],
    ]);
  });

  it('never lists a restaurant the owner did not rate, rather than giving it a made-up score', () => {
    const ranked = rankTierlistRestaurants(['unrated', 'rated'], [rating('rated', 20, 20, 20)]);

    expect(ranked.map((r) => r.restaurantId)).toEqual(['rated']);
  });
});
