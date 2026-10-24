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
import { CAN_REVIEW } from '@/core/review/daily-review-testing';
import { query, queryAll, textOf } from '@/testing/dom-testing';

/**
 * Profiles served by the fake API, by user id; the logged-in user is u1
 */
const profiles: Record<string, UserProfile> = {
  u1: { id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 1 },
  u2: { id: 'u2', name: 'Camille', avatarUrl: null, ratedRestaurantsCount: 2 },
};

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date: '2026-03-07T12:00:00+00:00',
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive: true,
  };
}

/**
 * Ratings served by the fake API, by user id
 */
const ratings: Record<string, UserRating[]> = {
  me: [rating('r1', 40)],
  u1: [rating('r1', 40)],
  u2: [rating('r1', 60), rating('r2', 90), rating('elsewhere', 100)],
};

/**
 * Builds a tierlist of `userId` holding r1 and r2.
 */
function tierlistOf(userId: string): Tierlist {
  return {
    id: 7,
    userId,
    name: 'Date night',
    description: 'Candles and good wine',
    emoji: '🕯️',
    restaurants: ['r1', 'r2'].map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned: true,
  };
}

describe('TierlistDetailView', () => {
  let fetchTierlistById: ReturnType<typeof vi.fn>;
  let setTierlistPinned: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fetchTierlistById = vi.fn();
    setTierlistPinned = vi.fn();
    fetchUserRatings = vi.fn((id = 'me') => of(ratings[id] ?? []));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        // The real routes, with u1 logged in
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        {
          provide: TierlistApi,
          // The tierlists page is opened for an unknown tierlist
          useValue: { fetchTierlistById, setTierlistPinned, fetchTierlistsByUserId: () => of([]) },
        },
        { provide: UserApi, useValue: { fetchUserProfile: (id: string) => of(profiles[id]) } },
        // The rating allowance locks the "+" of the restaurants of a ranking
        {
          provide: RatingApi,
          useValue: { fetchUserRatings, fetchRatingAllowance: () => of(CAN_REVIEW) },
        },
        { provide: RestaurantApi, useValue: {} },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /**
   * Opens the page of tierlist 7, and waits for it to load.
   */
  async function openTierlist(): Promise<void> {
    await harness.navigateByUrl('/tierlists/7');
    await harness.fixture.whenStable();
  }

  /**
   * Clicks the pin button, and waits for the change to be saved.
   */
  async function clickPin(): Promise<void> {
    query(harness.fixture, '.pin-btn').click();
    await harness.fixture.whenStable();
  }

  it("shows the tierlist and its owner, its restaurants ranked by the owner's ratings", async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    expect(fetchTierlistById).toHaveBeenCalledWith('7');
    expect(textOf(query(harness.fixture, '.title'))).toBe('Date night');
    expect(textOf(query(harness.fixture, '.description'))).toBe('Candles and good wine');
    expect(textOf(query(harness.fixture, '.owner-name'))).toBe('Camille');
    expect(textOf(query(harness.fixture, '.meta-chip'))).toBe('2 restaurants');
    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r2',
      'Restaurant r1',
    ]);
    expect(textOf(items[0]!.querySelector('.item-avg')!)).toBe('90');
  });

  it("shows my own score on someone else's tierlist, without letting me pin it", async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    const r1 = queryAll(harness.fixture, '.list-item').find((i) =>
      textOf(i).includes('Restaurant r1'),
    )!;
    expect(textOf(r1.querySelector('.my-score')!)).toBe('40');
    expect(queryAll(harness.fixture, '.pin-btn')).toHaveLength(0);
    expect(fetchUserRatings.mock.calls).toEqual([['u2'], ['me']]);
  });

  it('lets the owner pin their tierlist, without showing their score twice', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
  });

  it('requests my ratings once on my own tierlist, as its owner', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(fetchUserRatings.mock.calls).toEqual([['u1']]);
    expect(textOf(query(harness.fixture, '.item-name'))).toBe('Restaurant r1');
  });

  it('saves the pin when the owner unpins then pins their tierlist again', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    setTierlistPinned.mockImplementation((_id: number, pinned: boolean) =>
      of({ ...tierlistOf('u1'), pinned }),
    );
    await openTierlist();

    await clickPin();
    expect(setTierlistPinned).toHaveBeenLastCalledWith(7, false);
    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pin to profile');

    await clickPin();
    expect(setTierlistPinned).toHaveBeenLastCalledWith(7, true);
    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
  });

  it('keeps the saved pin and explains when the change fails', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    setTierlistPinned.mockReturnValue(throwError(() => new Error('503')));
    await openTierlist();

    await clickPin();

    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
    expect(textOf(query(harness.fixture, '.pin-error'))).toBe(
      "Couldn't update the pin, try again.",
    );
  });

  it('goes back to the tierlists for an unknown tierlist', async () => {
    fetchTierlistById.mockReturnValue(of(undefined));
    await openTierlist();

    expect(TestBed.inject(Router).url).toBe('/tierlists');
  });

  it('explains when the tierlist cannot be loaded, instead of loading forever', async () => {
    fetchTierlistById.mockReturnValue(throwError(() => new Error('503')));
    await openTierlist();

    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
    const error = query(harness.fixture, '.load-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(textOf(error)).toBe("Couldn't load the tierlist, try again.");
    expect(TestBed.inject(Router).url).toBe('/tierlists/7');
  });
});
