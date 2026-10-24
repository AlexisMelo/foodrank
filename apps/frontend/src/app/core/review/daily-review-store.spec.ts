import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { AuthStore } from '@/core/auth/auth-store';
import { DailyReviewStore } from './daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from './daily-review-testing';

describe('DailyReviewStore', () => {
  let fetchRatingAllowance: ReturnType<typeof vi.fn>;
  let loggedInUserId: WritableSignal<string | null>;

  beforeEach(() => {
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    loggedInUserId = signal('u1');
    TestBed.configureTestingModule({
      providers: [
        { provide: RatingApi, useValue: { fetchRatingAllowance } },
        { provide: AuthStore, useValue: { loggedInUserId } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Waits until the allowance is loaded.
   */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('leaves the review buttons unlocked while the user has not reviewed today', async () => {
    const store = TestBed.inject(DailyReviewStore);
    await settle();

    expect(fetchRatingAllowance).toHaveBeenCalledOnce();
    expect(store.locked()).toBe(false);
  });

  it('locks the review buttons once the user reviewed a restaurant today', async () => {
    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));

    const store = TestBed.inject(DailyReviewStore);
    await settle();

    expect(store.locked()).toBe(true);
  });

  it('does not ask while logged out, then asks for the user who logs in', async () => {
    loggedInUserId.set(null);
    const store = TestBed.inject(DailyReviewStore);
    await settle();
    expect(fetchRatingAllowance).not.toHaveBeenCalled();
    expect(store.locked()).toBe(false);

    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
    loggedInUserId.set('u2');
    await settle();

    expect(fetchRatingAllowance).toHaveBeenCalledOnce();
    expect(store.locked()).toBe(true);
  });

  it('leaves the buttons unlocked when the API fails, as it refuses a second review anyway', async () => {
    fetchRatingAllowance.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    const store = TestBed.inject(DailyReviewStore);
    await settle();

    expect(store.locked()).toBe(false);
  });

  it('asks again on refresh, so the buttons lock right after a review', async () => {
    const store = TestBed.inject(DailyReviewStore);
    await settle();

    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
    store.refresh();
    await settle();

    expect(fetchRatingAllowance).toHaveBeenCalledTimes(2);
    expect(store.locked()).toBe(true);
  });

  it('unlocks the buttons on their own at the next midnight UTC, without asking the API', async () => {
    // Only the timer of the unlock (rxjs uses setInterval): Angular keeps scheduling with setTimeout
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    // Allowed again in an hour
    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
    const store = TestBed.inject(DailyReviewStore);
    await settle();

    await vi.advanceTimersByTimeAsync(3_599_000);
    await settle();
    expect(store.locked()).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    await settle();
    expect(store.locked()).toBe(false);
    expect(fetchRatingAllowance).toHaveBeenCalledOnce();
  });
});
