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
import { query, queryAll, textOf } from '@/testing/dom-testing';

/**
 * Builds a rating of `restaurantId` given on `date`.
 */
function rating(restaurantId: string, date: string): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date,
    food: 90,
    service: 60,
    setting: 30,
    bonus: false,
    isActive: true,
  };
}

describe('Home', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    fetchUserProfile = vi.fn(() =>
      of({ id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 3 }),
    );
    fetchUserRatings = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        { provide: AuthStore, useValue: { isLoggedIn: signal(true) } },
        { provide: UserApi, useValue: { fetchUserProfile } },
        { provide: RatingApi, useValue: { fetchUserRatings } },
        { provide: RestaurantApi, useValue: {} },
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId: () => of([]) } },
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
          name: 'Alexis Melo',
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

    it('opens the profile page when clicked', async () => {
      await openHome();

      query(harness.fixture, '.user-bar').click();
      await harness.fixture.whenStable();

      expect(url()).toBe('/profile');
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
      expect(Array.from(cards[0]!.querySelectorAll('.criterion-score'), textOf)).toEqual([
        '90',
        '60',
        '30',
      ]);
    });

    it('dims a previous review, replaced by a more recent one of the same restaurant', async () => {
      fetchUserRatings.mockReturnValue(
        of([rating('r1', '2026-10-08'), { ...rating('r1', '2026-10-01'), isActive: false }]),
      );
      await openHome();

      expect(
        queryAll(harness.fixture, '.review-card').map((c) => c.classList.contains('inactive')),
      ).toEqual([false, true]);
    });

    it('opens the restaurant page when a review is clicked', async () => {
      fetchUserRatings.mockReturnValue(of([rating('r1', '2026-10-08')]));
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

  describe('favorites', () => {
    /**
     * Builds the active rating of `restaurantId`, with the same score for the three criteria.
     */
    function scored(restaurantId: string, score: number): UserRating {
      return {
        ...rating(restaurantId, '2026-10-08'),
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
        of([scored('ok', 60), scored('top', 95), scored('low', 20), scored('good', 80)]),
      );
      await openHome();

      expect(favorites()).toEqual(['Restaurant top', 'Restaurant good', 'Restaurant ok']);
      expect(
        queryAll(harness.fixture, '.favorites-list a.list-item').map((a) => a.getAttribute('href')),
      ).toEqual(['/restaurant/top', '/restaurant/good', '/restaurant/ok']);
    });

    it('ranks a restaurant by its active rating, its previous ratings left out', async () => {
      fetchUserRatings.mockReturnValue(
        of([
          scored('changed', 30),
          { ...scored('changed', 100), date: '2026-01-01', isActive: false },
          scored('steady', 70),
        ]),
      );
      await openHome();

      expect(favorites()).toEqual(['Restaurant steady', 'Restaurant changed']);
    });

    it('hides the section when the user has not rated any restaurant', async () => {
      await openHome();

      expect(textOf(harness.fixture.nativeElement)).not.toContain('Favorites');
    });
  });
});
