import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import type { RatingSummary, RestaurantRating } from '@/core/models/rating.model';
import { injectRestaurantRatings } from './restaurant-ratings';

/**
 * Averages of 2 ratings
 */
const SUMMARY: RatingSummary = { count: 2, food: 80, service: 70, setting: 60, global: 70 };

/**
 * Builds a rating of `restaurantId` by `userId`.
 */
function rating(
  restaurantId: string,
  userId: string,
  date = '2026-03-07T12:00:00+00:00',
): RestaurantRating {
  return {
    restaurantId,
    userId,
    date,
    food: 80,
    service: 70,
    setting: 60,
    bonus: false,
    isActive: true,
    userName: userId,
    userAvatarUrl: null,
  };
}

describe('injectRestaurantRatings', () => {
  let fetchRecentRatings: ReturnType<typeof vi.fn>;
  let fetchRecentFollowedRatings: ReturnType<typeof vi.fn>;
  let fetchMyRatings: ReturnType<typeof vi.fn>;
  let fetchRatingSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchRecentRatings = vi.fn(() => of([]));
    fetchRecentFollowedRatings = vi.fn(() => of([]));
    fetchMyRatings = vi.fn(() => of([]));
    fetchRatingSummary = vi.fn(() => of(SUMMARY));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RatingApi,
          useValue: {
            fetchRecentRatings,
            fetchRecentFollowedRatings,
            fetchMyRatings,
            fetchRatingSummary,
          },
        },
      ],
    });
  });

  /**
   * Waits until the ratings are loaded.
   */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it("loads the 5 most recent ratings of everyone and of the users followed, the user's own ratings and the averages of the restaurant", async () => {
    fetchRecentRatings.mockReturnValue(of([rating('r1', 'camille'), rating('r1', 'me')]));
    fetchRecentFollowedRatings.mockReturnValue(of([rating('r1', 'camille')]));
    fetchMyRatings.mockReturnValue(of([rating('r1', 'me')]));

    const { recentRatings, followedRatings, myRatings, summary, loading, loadError } =
      TestBed.runInInjectionContext(() => injectRestaurantRatings(() => 'r1'));
    expect(loading()).toBe(true);
    await settle();

    expect(fetchRecentRatings).toHaveBeenCalledWith('r1', 5);
    expect(fetchRecentFollowedRatings).toHaveBeenCalledWith('r1', 5);
    expect(fetchMyRatings).toHaveBeenCalledWith('r1');
    expect(fetchRatingSummary).toHaveBeenCalledWith('r1');
    expect(recentRatings().map((r) => r.userId)).toEqual(['camille', 'me']);
    expect(followedRatings().map((r) => r.userId)).toEqual(['camille']);
    expect(myRatings().map((r) => r.userId)).toEqual(['me']);
    expect(summary()).toEqual(SUMMARY);
    expect(loading()).toBe(false);
    expect(loadError()).toBe(false);
  });

  it('loads nothing while the restaurant is unknown', async () => {
    const { recentRatings, followedRatings, myRatings, summary, loading } =
      TestBed.runInInjectionContext(() => injectRestaurantRatings(() => null));
    await settle();

    expect(fetchRecentRatings).not.toHaveBeenCalled();
    expect(fetchRecentFollowedRatings).not.toHaveBeenCalled();
    expect(fetchMyRatings).not.toHaveBeenCalled();
    expect(fetchRatingSummary).not.toHaveBeenCalled();
    expect(recentRatings()).toEqual([]);
    expect(followedRatings()).toEqual([]);
    expect(myRatings()).toEqual([]);
    expect(summary()).toBeNull();
    expect(loading()).toBe(false);
  });

  it('reports an error when the API fails', async () => {
    fetchRecentRatings.mockReturnValue(throwError(() => new Error('503')));

    const { loading, loadError } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(() => 'r1'),
    );
    await settle();

    expect(loadError()).toBe(true);
    expect(loading()).toBe(false);
  });

  it('reports an error when the ratings of the users followed cannot be loaded', async () => {
    fetchRecentFollowedRatings.mockReturnValue(throwError(() => new Error('503')));

    const { followedRatings, loadError } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(() => 'r1'),
    );
    await settle();

    expect(loadError()).toBe(true);
    expect(followedRatings()).toEqual([]);
  });

  it('reports an error when the averages cannot be loaded', async () => {
    fetchRatingSummary.mockReturnValue(throwError(() => new Error('503')));

    const { summary, loadError } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(() => 'r1'),
    );
    await settle();

    expect(loadError()).toBe(true);
    expect(summary()).toBeNull();
  });

  it('reloads the ratings and averages when the restaurant changes', async () => {
    fetchRecentRatings.mockImplementation((id: string) => of([rating(id, 'camille')]));
    fetchRatingSummary
      .mockReturnValueOnce(of(SUMMARY))
      .mockReturnValueOnce(of({ ...SUMMARY, global: 42 }));
    const restaurantId = signal<string | null>('r1');

    const { recentRatings, summary } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(restaurantId),
    );
    await settle();
    restaurantId.set('r2');
    await settle();

    expect(recentRatings().map((r) => r.restaurantId)).toEqual(['r2']);
    expect(fetchRatingSummary).toHaveBeenLastCalledWith('r2');
    expect(summary()?.global).toBe(42);
  });

  it('reloads the ratings on demand, keeping the ones loaded shown meanwhile', async () => {
    const secondAnswer = new Subject<RestaurantRating[]>();
    fetchMyRatings
      .mockReturnValueOnce(
        of([
          rating('r1', 'me', '2026-03-07T12:00:00+00:00'),
          rating('r1', 'me', '2026-01-02T12:00:00+00:00'),
        ]),
      )
      .mockReturnValueOnce(secondAnswer);

    const { myRatings, loading, reload } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(() => 'r1'),
    );
    await settle();
    reload();
    TestBed.inject(ApplicationRef).tick();

    expect(fetchMyRatings).toHaveBeenCalledTimes(2);
    expect(loading()).toBe(false);
    expect(myRatings()).toHaveLength(2);

    secondAnswer.next([rating('r1', 'me', '2026-01-02T12:00:00+00:00')]);
    secondAnswer.complete();
    await settle();

    expect(myRatings().map((r) => r.date)).toEqual(['2026-01-02T12:00:00+00:00']);
  });

  it('ignores the late answer of the previous restaurant', async () => {
    const firstAnswer = new Subject<RestaurantRating[]>();
    fetchRecentRatings
      .mockReturnValueOnce(firstAnswer)
      .mockReturnValueOnce(of([rating('r2', 'camille')]));
    const restaurantId = signal<string | null>('r1');

    const { recentRatings } = TestBed.runInInjectionContext(() =>
      injectRestaurantRatings(restaurantId),
    );
    // The request of r1 starts, then the restaurant changes before it answers
    TestBed.inject(ApplicationRef).tick();
    restaurantId.set('r2');
    await settle();
    firstAnswer.next([rating('r1', 'old')]);
    firstAnswer.complete();
    await settle();

    expect(fetchRecentRatings).toHaveBeenCalledTimes(2);
    expect(recentRatings().map((r) => r.restaurantId)).toEqual(['r2']);
  });
});
