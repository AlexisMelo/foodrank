import { Service, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, concat, map, of, switchMap, timer } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { RatingAllowance } from '@/core/models/rating.model';

/**
 * Why the review buttons are locked, shown as their tooltip and on the rating page
 */
export const REVIEW_LOCKED_REASON = 'You already reviewed a restaurant today, come back tomorrow.';

/**
 * Emits `allowance`, then, when it refuses a review, an allowance emitted at its nextRatingAt (the next midnight UTC),
 * so the review buttons unlock on their own when the app stays open overnight
 */
function untilNextReview(allowance: RatingAllowance): Observable<RatingAllowance> {
  if (allowance.canRate || allowance.nextRatingAt === null) return of(allowance);
  return concat(
    of(allowance),
    timer(new Date(allowance.nextRatingAt)).pipe(
      map((): RatingAllowance => ({ canRate: true, nextRatingAt: null })),
    ),
  );
}

/**
 * The "one review per day" rule, shared by every button starting a review (the "+ New" chips, the "+" bubbles of a
 * ranking, the explorer celebration) and by the rating page: a user reviews at most one restaurant per day (UTC), as
 * they can visit only one restaurant a day. The API decides (GET /api/users/me/rating-allowance), and refuses a second
 * review of the day with a 409 whatever the buttons show. The search of the tab bar stays open: it only leads to
 * restaurant pages.
 */
@Service()
export class DailyReviewStore {
  /**
   * Asks the API whether the logged-in user can review
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * The logged-in user: their allowance is loaded again when they change (login, logout)
   */
  private readonly auth = inject(AuthStore);

  /**
   * Allowance of the logged-in user, turning into an allowance to review at its nextRatingAt; idle while logged out
   */
  private readonly allowance = rxResource({
    params: () => this.auth.loggedInUserId() ?? undefined,
    stream: () => this.ratingApi.fetchRatingAllowance().pipe(switchMap(untilNextReview)),
  });

  /**
   * True when the logged-in user already reviewed a restaurant today: the review buttons are locked until the next
   * midnight UTC. False while loading, when logged out and when the API fails, as the API refuses a second review anyway
   */
  readonly locked = computed(() => this.allowance.hasValue() && !this.allowance.value().canRate);

  /**
   * Asks the API again, once a review was saved or refused, so the buttons lock right away
   */
  refresh(): void {
    this.allowance.reload();
  }
}
