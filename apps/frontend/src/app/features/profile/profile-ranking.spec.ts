import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import type { UserRating } from '@/core/models/rating.model';
import { injectProfileRanking } from './profile-ranking';

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number, isActive = true): UserRating {
  return {
    restaurantId,
    restaurantName: restaurantId,
    restaurantEmoji: '🍽️',
    restaurantAddress: '',
    date: '2026-03-07T12:00:00+00:00',
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive,
  };
}

describe('injectProfileRanking', () => {
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

  it("ranks the logged-in user's restaurants without loading anything else", async () => {
    fetchUserRatings.mockReturnValue(of([rating('ok', 6), rating('top', 9)]));

    const { rankedRestaurants, isOwnProfile, loading } = TestBed.runInInjectionContext(() =>
      injectProfileRanking(),
    );
    await settle();

    expect(fetchUserRatings).toHaveBeenCalledOnce();
    expect(fetchUserRatings).toHaveBeenCalledWith('me');
    expect(isOwnProfile()).toBe(true);
    expect(rankedRestaurants().map((r) => r.restaurantId)).toEqual(['top', 'ok']);
    expect(rankedRestaurants().every((r) => r.myScore === undefined)).toBe(true);
    expect(loading()).toBe(false);
  });

  it("on another user's profile, adds the logged-in user's own score of each restaurant", async () => {
    fetchUserRatings.mockImplementation((id: string) =>
      of(
        id === 'me'
          ? [rating('both', 4), rating('both', 10, false)]
          : [rating('both', 8), rating('only-them', 7), rating('both', 1, false)],
      ),
    );

    const { rankedRestaurants, isOwnProfile } = TestBed.runInInjectionContext(() =>
      injectProfileRanking(() => 'u2'),
    );
    await settle();

    expect(isOwnProfile()).toBe(false);
    expect(rankedRestaurants()).toMatchObject([
      { restaurantId: 'both', overall: 8, myScore: 4 },
      { restaurantId: 'only-them', overall: 7, myScore: undefined },
    ]);
  });

  it('reports an error and ranks nothing when the API fails', async () => {
    fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));

    const { rankedRestaurants, loadError } = TestBed.runInInjectionContext(() =>
      injectProfileRanking(),
    );
    await settle();

    expect(loadError()).toBe(true);
    expect(rankedRestaurants()).toEqual([]);
  });
});
