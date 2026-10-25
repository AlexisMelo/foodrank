import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import type { UserRating } from '@/core/models/rating.model';
import { injectMyRatings } from './my-ratings';

/**
 * Builds a rating of `restaurantId` given on `date`.
 */
function rating(restaurantId: string, date: string): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    restaurantAddress: '',
    date,
    food: 80,
    service: 70,
    setting: 60,
    bonus: false,
    isActive: true,
  };
}

describe('injectMyRatings', () => {
  let fetchUserRatings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchUserRatings = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: RatingApi, useValue: { fetchUserRatings } }],
    });
  });

  /**
   * Waits until the ratings are loaded.
   */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it("keeps the logged-in user's first ratings, in the API order (most recent first)", async () => {
    fetchUserRatings.mockReturnValue(
      of([rating('r1', '2026-10-08T12:00:00+00:00'), rating('r2', '2026-10-07T12:00:00+00:00'), rating('r3', '2026-10-06T12:00:00+00:00')]),
    );

    const { ratings, loading, loadError } = TestBed.runInInjectionContext(() => injectMyRatings(2));
    expect(loading()).toBe(true);
    await settle();

    expect(fetchUserRatings).toHaveBeenCalledWith('me');
    expect(ratings().map((r) => r.restaurantId)).toEqual(['r1', 'r2']);
    expect(loading()).toBe(false);
    expect(loadError()).toBe(false);
  });

  it('keeps every rating without a limit', async () => {
    fetchUserRatings.mockReturnValue(
      of(Array.from({ length: 7 }, (_, i) => rating(`r${i}`, '2026-10-08T12:00:00+00:00'))),
    );

    const { ratings } = TestBed.runInInjectionContext(() => injectMyRatings());
    await settle();

    expect(ratings()).toHaveLength(7);
  });

  it('reports an error when the API fails', async () => {
    fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));

    const { ratings, loading, loadError } = TestBed.runInInjectionContext(() => injectMyRatings());
    await settle();

    expect(ratings()).toEqual([]);
    expect(loadError()).toBe(true);
    expect(loading()).toBe(false);
  });
});
