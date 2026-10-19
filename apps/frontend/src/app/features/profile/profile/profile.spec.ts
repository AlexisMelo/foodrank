import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserRating } from '@/core/models/rating.model';
import type { UserProfile } from '@/core/models/user.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';

/**
 * Profiles served by the fake API, by user id
 */
const profiles: Record<string, UserProfile> = {
  me: { id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 2 },
  u2: { id: 'u2', name: 'Camille', avatarUrl: null, ratedRestaurantsCount: 2 },
};

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number, isActive = true): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date: '2026-03-07',
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive,
  };
}

/**
 * Ratings served by the fake API, by user id
 */
const ratings: Record<string, UserRating[]> = {
  // r1 rated twice: listed once, with the latest (active) rating
  me: [rating('r1', 70), rating('r2', 90), rating('r1', 80, false)],
  u2: [rating('r1', 50), rating('r3', 95)],
};

describe('ProfileView', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fetchUserProfile = vi.fn((id = 'me') => of(profiles[id]));
    fetchUserRatings = vi.fn((id = 'me') => of(ratings[id] ?? []));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        { provide: AuthStore, useValue: { isLoggedIn: signal(true), currentUserId: 'me' } },
        { provide: UserApi, useValue: { fetchUserProfile } },
        {
          provide: RatingApi,
          // Community visits: read by the home page
          useValue: { fetchUserRatings, fetchCommunityVisitsByUserId: () => of([]) },
        },
        {
          provide: TierlistApi,
          useValue: {
            fetchPinnedTierlistsByUserId: () => of([]),
            // Read by the home page
            fetchTierlistsByUserId: () => of([]),
          },
        },
        // Read by the home page
        { provide: RestaurantApi, useValue: { fetchRestaurants: () => of([]) } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /**
   * Opens `path` in the app and waits for it to load.
   */
  async function open(path: string): Promise<void> {
    await harness.navigateByUrl(path);
    await harness.fixture.whenStable();
  }

  it("shows the logged-in user's real name and number of restaurants rated", async () => {
    await open('/profile');

    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    expect(textOf(query(harness.fixture, '.winner-tag'))).toBe('2 restaurants');
    expect(textOf(query(harness.fixture, '.winner-avatar'))).toBe('A');
  });

  it('ranks the restaurants the user rated, best first, each listed once', async () => {
    await open('/profile');

    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r2',
      'Restaurant r1',
    ]);
    expect(textOf(items[1]!.querySelector('.item-avg')!)).toBe('70');
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
  });

  it('explains when the user has not rated any restaurant', async () => {
    fetchUserRatings.mockReturnValue(of([]));
    await open('/profile');

    expect(textOf(query(harness.fixture, '.empty'))).toContain('No restaurant rated yet');
  });

  it("shows another user's profile with my own score, or a link to rate", async () => {
    await open('/user/u2');

    expect(fetchUserProfile).toHaveBeenCalledWith('u2');
    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Camille');
    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r3',
      'Restaurant r1',
    ]);
    // Never rated r3: offer to rate it
    expect(items[0]!.querySelector('.my-score-rate')).not.toBeNull();
    // Rated r1 twice (70, then 80 before): my active rating
    expect(textOf(items[1]!.querySelector('.my-score')!)).toBe('70');
  });

  it('goes back home for an unknown user', async () => {
    await open('/user/unknown');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
