import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
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

/**
 * Builds the tierlist `id` of `userId`, pinned to their profile.
 */
function pinnedTierlist(id: number, userId: string): Tierlist {
  return {
    id,
    userId,
    name: `Tierlist ${id}`,
    description: null,
    emoji: '🏆',
    restaurants: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned: true,
  };
}

describe('ProfileView', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let fetchPinnedTierlistsByUserId: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fetchUserProfile = vi.fn((id = 'me') => of(profiles[id]));
    fetchUserRatings = vi.fn((id = 'me') => of(ratings[id] ?? []));
    fetchPinnedTierlistsByUserId = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        { provide: UserApi, useValue: { fetchUserProfile } },
        // Ratings of the user shown and of the logged-in user, also read by the home and rating pages
        { provide: RatingApi, useValue: { fetchUserRatings } },
        {
          provide: TierlistApi,
          useValue: {
            fetchPinnedTierlistsByUserId,
            // Read by the home page
            fetchTierlistsByUserId: () => of([]),
          },
        },
        // Read by the rating page, opened from the "+" of a restaurant
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById: (id: string) => of({ id, name: `Restaurant ${id}`, emoji: '🍕' }),
          },
        },
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

  it('explains when the profile cannot be loaded, instead of a blank page', async () => {
    fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));
    await open('/profile');

    expect(textOf(query(harness.fixture, '[role="alert"]'))).toBe(
      "Couldn't load this profile, try again.",
    );
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
  });

  it('explains when the ratings cannot be loaded, instead of saying none were given', async () => {
    fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));
    await open('/profile');

    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    expect(textOf(query(harness.fixture, '.empty'))).toBe("Couldn't load the ratings");
    expect(textOf(harness.fixture.nativeElement)).not.toContain('No restaurant rated yet');
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

  it('opens the rating page from the "+" of a restaurant I never rated, not the restaurant page', async () => {
    await open('/user/u2');

    query(harness.fixture, '.my-score-rate').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/review/r3');
  });

  it('shows the tierlists pinned by the user shown, opening them', async () => {
    fetchPinnedTierlistsByUserId.mockReturnValue(
      of([pinnedTierlist(4, 'u2'), pinnedTierlist(9, 'u2')]),
    );
    await open('/user/u2');

    expect(fetchPinnedTierlistsByUserId).toHaveBeenCalledWith('u2');
    expect(queryAll(harness.fixture, '.tierlist-chip-name').map(textOf)).toEqual([
      'Tierlist 4',
      'Tierlist 9',
    ]);
    expect(query(harness.fixture, '.tierlist-chip').getAttribute('href')).toBe('/tierlists/4');
  });

  it('loads my own pinned tierlists on /profile, and hides the section when there is none', async () => {
    await open('/profile');

    // The id of the profile loaded, not the "me" of the API url
    expect(fetchPinnedTierlistsByUserId).toHaveBeenCalledWith('u1');
    expect(textOf(harness.fixture.nativeElement)).not.toContain('Pinned tierlists');
  });

  it('opens my own profile on /profile when reached by my id, loading my ratings once', async () => {
    await open('/user/u1');

    expect(TestBed.inject(Router).url).toBe('/profile');
    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    // My own profile: no "my score", no rate button, and only my ratings are requested
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
    expect(queryAll(harness.fixture, '.my-score-rate')).toHaveLength(0);
    expect(fetchUserProfile.mock.calls).toEqual([['me']]);
    expect(fetchUserRatings.mock.calls).toEqual([['me']]);
  });

  it("loads my ratings once more on another user's profile, for my own scores", async () => {
    await open('/user/u2');

    expect(fetchUserRatings.mock.calls).toEqual([['u2'], ['me']]);
  });

  it('goes back home for an unknown user', async () => {
    await open('/user/unknown');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
