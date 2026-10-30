import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import { LocationStore } from '@/core/location/location-store';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { NewReviewStore } from '@/core/review/new-review-store';
import { query, queryAll, stubDialogs, textOf } from '@/testing/dom-testing';

/**
 * Builds a rating of `restaurantId` given on `date`.
 */
function rating(restaurantId: string, date: string): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantAddress: '',
    date,
    food: 9,
    service: 6,
    setting: 3,
    bonus: false,
    isActive: true,
  };
}

/**
 * Builds the tierlist `id` of the logged-in user, last updated on `updatedAt`.
 */
function tierlist(id: number, updatedAt: string): Tierlist {
  return {
    id,
    userId: 'u1',
    name: `Tierlist ${id}`,
    description: null,
    emoji: '🍕',
    restaurants: [],
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt,
    pinned: false,
  };
}

describe('Home', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let fetchRatingAllowance: ReturnType<typeof vi.fn>;
  let fetchTierlistsByUserId: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    // The new review sheet of the app layout is a native dialog
    stubDialogs();
    fetchUserProfile = vi.fn(() =>
      of({
        id: 'u1',
        username: 'alexis.melo',
        displayName: 'Alexis Melo',
        avatarUrl: null,
        ratedRestaurantsCount: 3,
      }),
    );
    fetchUserRatings = vi.fn(() => of([]));
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    fetchTierlistsByUserId = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        { provide: UserApi, useValue: { fetchUserProfile } },
        // The rating allowance locks the review buttons
        { provide: RatingApi, useValue: { fetchUserRatings, fetchRatingAllowance } },
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId } },
        // Asked for by the app layout when it opens, and refreshed by the new review sheet, whose search area hint
        // reads the status and the city
        {
          provide: LocationStore,
          useValue: {
            status: signal('idle'),
            city: signal('Lyon'),
            requestLocation: vi.fn(),
            refreshLocation: vi.fn(),
          },
        },
      ],
    });
  });

  /**
   * Opens the home page and waits for it to load.
   */
  async function openHome(): Promise<void> {
    harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
  }

  /**
   * Current path of the app.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  describe('top bar', () => {
    it("shows the logged-in user's real name and number of restaurants rated", async () => {
      await openHome();

      expect(fetchUserProfile).toHaveBeenCalledWith('me');
      expect(textOf(query(harness.fixture, '.user-name'))).toBe('Alexis Melo');
      expect(textOf(query(harness.fixture, '.user-visited'))).toBe('3 restaurants');
      expect(textOf(query(harness.fixture, '.user-avatar'))).toBe('A');
      expect(textOf(harness.fixture.nativeElement)).not.toContain('Alex Dupont');
    });

    it('shows the profile picture when the user has one', async () => {
      fetchUserProfile.mockReturnValue(
        of({
          id: 'u1',
          username: 'alexis.melo',
          displayName: 'Alexis Melo',
          avatarUrl: 'https://img.test/me.png',
          ratedRestaurantsCount: 1,
        }),
      );
      await openHome();

      expect(query(harness.fixture, 'img.user-avatar').getAttribute('src')).toBe(
        'https://img.test/me.png',
      );
      expect(textOf(query(harness.fixture, '.user-visited'))).toBe('1 restaurant');
    });

    it('explains when the profile cannot be loaded, instead of loading forever', async () => {
      fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));
      await openHome();

      expect(textOf(query(harness.fixture, '.user-bar-error'))).toBe("Couldn't load your profile");
      expect(queryAll(harness.fixture, '.user-bar-skeleton')).toHaveLength(0);
      // The rest of the top bar still works
      expect(queryAll(harness.fixture, '.settings-btn')).toHaveLength(1);
    });

    it('links to the profile page from the user bar', async () => {
      await openHome();
      const userBar = query(harness.fixture, '.user-bar');
      expect(userBar.getAttribute('href')).toBe('/profile');

      userBar.click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/profile');
    });

    it('links to the settings page from the gear', async () => {
      await openHome();
      const settings = query(harness.fixture, '.settings-btn');
      expect(settings.getAttribute('href')).toBe('/settings');

      settings.click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/settings');
    });
  });

  describe('new review', () => {
    /**
     * True while the new review sheet is shown.
     */
    function sheetOpen(): boolean {
      return (harness.fixture.nativeElement as HTMLElement).querySelector('dialog')?.open ?? false;
    }

    it('opens the new review sheet from the "+ New" chip of the recent reviews', async () => {
      await openHome();
      expect(sheetOpen()).toBe(false);
      // An action, not a page: a button, not a link
      const chip = query(harness.fixture, '.add-chip');
      expect(chip.tagName).toBe('BUTTON');

      chip.click();
      await harness.fixture.whenStable();

      expect(TestBed.inject(NewReviewStore).isOpen()).toBe(true);
      expect(sheetOpen()).toBe(true);
      expect(url()).toBe('/');
    });

    it('opens the new review sheet from the button of the tab bar', async () => {
      await openHome();

      query(harness.fixture, '.tab-btn-search').click();
      await harness.fixture.whenStable();

      expect(sheetOpen()).toBe(true);
    });

    it('locks the "+ New" chip once a restaurant was reviewed today', async () => {
      fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
      await openHome();

      const chip = query<HTMLButtonElement>(harness.fixture, '.add-chip');
      expect(chip.disabled).toBe(true);
      expect(chip.title).toBe(REVIEW_LOCKED_REASON);
      expect(chip.querySelector('app-lock-icon')).not.toBeNull();

      chip.click();
      await harness.fixture.whenStable();

      expect(sheetOpen()).toBe(false);
    });

    it('still opens the search of the tab bar once a restaurant was reviewed today: it only leads to restaurant pages', async () => {
      fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
      await openHome();

      const tabButton = query<HTMLButtonElement>(harness.fixture, '.tab-btn-search');
      expect(tabButton.disabled).toBe(false);
      expect(tabButton.querySelector('app-lock-icon')).toBeNull();

      tabButton.click();
      await harness.fixture.whenStable();

      expect(sheetOpen()).toBe(true);
    });

    it('shows no padlock while the user can review', async () => {
      await openHome();

      expect(fetchRatingAllowance).toHaveBeenCalledOnce();
      expect(queryAll(harness.fixture, 'app-lock-icon')).toHaveLength(0);
      expect(query<HTMLButtonElement>(harness.fixture, '.add-chip').disabled).toBe(false);
    });
  });

  describe('recent reviews', () => {
    it('shows the last 5 reviews of the logged-in user, most recent first', async () => {
      fetchUserRatings.mockReturnValue(
        of(Array.from({ length: 7 }, (_, i) => rating(`r${i}`, `2026-10-0${8 - i}`))),
      );
      await openHome();

      expect(fetchUserRatings).toHaveBeenCalledWith('me');
      const cards = queryAll(harness.fixture, '.review-card');
      expect(cards.map((c) => textOf(c.querySelector('.restaurant-name')!))).toEqual([
        'Restaurant r0',
        'Restaurant r1',
        'Restaurant r2',
        'Restaurant r3',
        'Restaurant r4',
      ]);
      expect(textOf(cards[0]!.querySelector('.visit-date')!)).toBe('Oct 8');
      // The scores under the emojis, and their average in the bubble: a round 6, without decimal
      expect(Array.from(cards[0]!.querySelectorAll('.score-value'), textOf)).toEqual([
        '9',
        '6',
        '3',
      ]);
      expect(textOf(cards[0]!.querySelector('.avg-bubble')!)).toBe('6');
    });

    it('dims a previous review, replaced by a more recent one of the same restaurant', async () => {
      fetchUserRatings.mockReturnValue(
        of([rating('r1', '2026-10-08T12:00:00+00:00'), { ...rating('r1', '2026-10-01T12:00:00+00:00'), isActive: false }]),
      );
      await openHome();

      expect(
        queryAll(harness.fixture, '.review-card').map((c) => c.classList.contains('inactive')),
      ).toEqual([false, true]);
    });

    it('opens the restaurant page when a review is clicked', async () => {
      fetchUserRatings.mockReturnValue(of([rating('r1', '2026-10-08T12:00:00+00:00')]));
      await openHome();

      query(harness.fixture, '.review-card').click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/restaurant/r1');
    });

    it('explains when the user has not reviewed any restaurant', async () => {
      await openHome();

      expect(queryAll(harness.fixture, '.review-card')).toHaveLength(0);
      expect(textOf(query(harness.fixture, '.empty'))).toContain('No review yet');
    });

    it('explains when the reviews could not be loaded', async () => {
      fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));
      await openHome();

      expect(textOf(query(harness.fixture, '.empty'))).toBe("Couldn't load your reviews");
    });
  });

  describe('tierlists', () => {
    /**
     * Names of the tierlists shown, in order.
     */
    function tierlistNames(): string[] {
      return queryAll(harness.fixture, '.tierlist-chip-name').map(textOf);
    }

    it("shows the logged-in user's 8 most recently updated tierlists, and opens the one clicked", async () => {
      fetchTierlistsByUserId.mockReturnValue(
        of(
          Array.from({ length: 10 }, (_, i) =>
            tierlist(i, `2026-10-${10 + ((i * 7) % 10)}T10:00:00Z`),
          ),
        ),
      );
      await openHome();

      expect(fetchTierlistsByUserId).toHaveBeenCalledWith();
      // Updated on the 19th (i = 7), 18th (i = 4), 17th (i = 1)… the 10th and 11th (i = 0, 3) left out
      expect(tierlistNames()).toEqual([
        'Tierlist 7',
        'Tierlist 4',
        'Tierlist 1',
        'Tierlist 8',
        'Tierlist 5',
        'Tierlist 2',
        'Tierlist 9',
        'Tierlist 6',
      ]);
      expect(query(harness.fixture, '.see-all-chip').getAttribute('href')).toBe('/tierlists');

      query(harness.fixture, '.tierlist-chip').click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/tierlists/7');
    });

    it('hides the section when the user has no tierlist', async () => {
      await openHome();

      expect(tierlistNames()).toEqual([]);
      expect(queryAll(harness.fixture, '.section-title').map(textOf)).not.toContain('Tierlists');
    });

    it('hides the section when the tierlists cannot be loaded, the rest of the page still shown', async () => {
      fetchTierlistsByUserId.mockReturnValue(throwError(() => new Error('503')));
      fetchUserRatings.mockReturnValue(of([rating('r1', '2026-10-08T12:00:00+00:00')]));
      await openHome();

      expect(tierlistNames()).toEqual([]);
      expect(queryAll(harness.fixture, '.review-card')).toHaveLength(1);
    });
  });

  describe('favorites', () => {
    /**
     * Builds the active rating of `restaurantId`, with the same score for the three criteria.
     */
    function scored(restaurantId: string, score: number): UserRating {
      return {
        ...rating(restaurantId, '2026-10-08T12:00:00+00:00'),
        restaurantAddress: `${restaurantId} street, Caen`,
        food: score,
        service: score,
        setting: score,
      };
    }

    /**
     * Names of the favorite restaurants shown, in order.
     */
    function favorites(): string[] {
      return queryAll(harness.fixture, '.favorites-list .item-name').map(textOf);
    }

    it("shows the logged-in user's 3 best rated restaurants, best first", async () => {
      fetchUserRatings.mockReturnValue(
        of([scored('ok', 6), scored('top', 10), scored('low', 2), scored('good', 8)]),
      );
      await openHome();

      expect(favorites()).toEqual(['Restaurant top', 'Restaurant good', 'Restaurant ok']);
      expect(
        queryAll(harness.fixture, '.favorites-list a.item-link').map((a) => a.getAttribute('href')),
      ).toEqual(['/restaurant/top', '/restaurant/good', '/restaurant/ok']);
    });

    it('shows the address of each favorite under its name', async () => {
      fetchUserRatings.mockReturnValue(of([scored('top', 10), scored('good', 8)]));
      await openHome();

      expect(queryAll(harness.fixture, '.favorites-list .item-sub').map(textOf)).toEqual([
        'top street, Caen',
        'good street, Caen',
      ]);
    });

    it('ranks a restaurant by its active rating, its previous ratings left out', async () => {
      fetchUserRatings.mockReturnValue(
        of([
          scored('changed', 3),
          { ...scored('changed', 10), date: '2026-01-01T12:00:00+00:00', isActive: false },
          scored('steady', 7),
        ]),
      );
      await openHome();

      expect(favorites()).toEqual(['Restaurant steady', 'Restaurant changed']);
    });

    it('hides the section when the user has not rated any restaurant', async () => {
      await openHome();

      expect(textOf(harness.fixture.nativeElement)).not.toContain('Favorites');
    });

    it('shares a single request of my ratings with the recent reviews', async () => {
      fetchUserRatings.mockReturnValue(of([scored('top', 10), scored('ok', 6)]));
      await openHome();

      expect(fetchUserRatings.mock.calls).toEqual([['me']]);
      expect(queryAll(harness.fixture, '.review-card')).toHaveLength(2);
      expect(favorites()).toEqual(['Restaurant top', 'Restaurant ok']);
    });

    it('hides the section when my ratings cannot be loaded', async () => {
      fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));
      await openHome();

      expect(textOf(harness.fixture.nativeElement)).not.toContain('Favorites');
    });
  });
});
