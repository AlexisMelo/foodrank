import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { RatingInput, RatingSummary, RestaurantRating } from '@/core/models/rating.model';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { query, queryAll, setValue, textOf } from '@/testing/dom-testing';

/**
 * In-memory replacement of the API: ratings saved by rateRestaurant are returned by the fetch functions.
 */
class FakeRatingApi {
  /**
   * Every rating stored, in insertion order
   */
  ratings: RestaurantRating[] = [];

  /**
   * Ratings of the restaurant, most recent first, like the API
   */
  private ofRestaurant(restaurantId: string): RestaurantRating[] {
    return this.ratings
      .filter((r) => r.restaurantId === restaurantId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Like the API: the most recent active ratings
   */
  fetchRecentRatings(id: string, limit = 5) {
    return of(
      this.ofRestaurant(id)
        .filter((r) => r.isActive)
        .slice(0, limit),
    );
  }

  /**
   * The logged-in user follows nobody: no rating under "Followed"
   */
  fetchRecentFollowedRatings() {
    return of<RestaurantRating[]>([]);
  }

  /**
   * Like the API: every rating of the logged-in user ("me")
   */
  fetchMyRatings(id: string) {
    return of(this.ofRestaurant(id).filter((r) => r.userId === 'me'));
  }

  /**
   * Like the API: averages of the active ratings, null when there is none
   */
  fetchRatingSummary(id: string) {
    const active = this.ofRestaurant(id).filter((r) => r.isActive);
    const average = (scores: number[]) =>
      scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    return of<RatingSummary>({
      count: active.length,
      food: average(active.map((r) => r.food)),
      service: average(active.map((r) => r.service)),
      setting: average(active.map((r) => r.setting)),
      global: average(active.flatMap((r) => [r.food, r.service, r.setting])),
    });
  }

  /**
   * The logged-in user has no rating: no past review is shown under the sliders
   */
  fetchUserRatings() {
    return of([]);
  }

  /**
   * True once the logged-in user rated a restaurant through rateRestaurant ("today")
   */
  reviewedToday = false;

  /**
   * Like the API: a user rates at most one restaurant per day
   */
  fetchRatingAllowance() {
    return of(this.reviewedToday ? alreadyReviewed() : CAN_REVIEW);
  }

  /**
   * Like the API, the new rating becomes the active one: the previous ones are kept, inactive
   */
  rateRestaurant(restaurantId: string, rating: RatingInput) {
    this.reviewedToday = true;
    for (const previous of this.ratings) {
      if (previous.restaurantId === restaurantId && previous.userId === 'me') {
        previous.isActive = false;
      }
    }
    this.ratings.push({
      restaurantId,
      userId: 'me',
      date: '2026-10-09T12:00:00+00:00',
      food: rating.food,
      service: rating.service,
      setting: rating.setting,
      bonus: rating.bonus,
      isActive: true,
      userName: 'Me',
      userAvatarUrl: null,
    });
    return of(undefined);
  }
}

describe('rating a restaurant from its page', () => {
  let api: FakeRatingApi;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    api = new FakeRatingApi();
    api.ratings = [
      {
        restaurantId: 'r1',
        userId: 'me',
        date: '2026-01-02T12:00:00+00:00',
        food: 5,
        service: 5,
        setting: 5,
        bonus: false,
        isActive: true,
        userName: 'Me',
        userAvatarUrl: null,
      },
    ];
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('me') },
        },
        { provide: RatingApi, useValue: api },
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById: (id: string) => of({ id, name: 'Pizza Roma', emoji: '🍕' }),
          },
        },
        // The rating page offers no tierlist to add the restaurant to
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId: () => of([]) } },
      ],
    });
  });

  /**
   * Opens `path` in the app and waits for it to load.
   */
  async function openApp(path: string): Promise<void> {
    harness = await RouterTestingHarness.create(path);
    await harness.fixture.whenStable();
  }

  /**
   * Current path of the app.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  /**
   * Clicks the element matching `selector`, then waits for the app to update.
   */
  async function click(selector: string): Promise<void> {
    query(harness.fixture, selector).click();
    await harness.fixture.whenStable();
  }

  it('shows the new review on the restaurant page once saved', async () => {
    await openApp('/restaurant/r1');
    expect(queryAll(harness.fixture, '.rating-card')).toHaveLength(1);

    // "New" → rating page
    expect(query(harness.fixture, '.add-chip').getAttribute('href')).toBe('/review/r1');
    await click('.add-chip');
    expect(url()).toBe('/review/r1');

    const [food, service, decor] = queryAll<HTMLInputElement>(
      harness.fixture,
      'input[type="range"]',
    );
    await setValue(harness.fixture, food!, '9');
    await setValue(harness.fixture, service!, '7');
    await setValue(harness.fixture, decor!, '4');
    await click('.crush-toggle');
    await click('.submit-btn');

    // Back on the restaurant page, "My Visits" lists the new review first
    expect(url()).toBe('/restaurant/r1');
    const cards = queryAll(harness.fixture, '.rating-card');
    expect(cards).toHaveLength(2);
    expect(textOf(cards[0]!)).toContain('October 9, 2026');
    expect(textOf(cards[0]!)).toContain('💘');
    // The scores under the emojis, and their average with one decimal: (9 + 7 + 4) / 3 = 6.67
    expect(Array.from(cards[0]!.querySelectorAll('.score-value'), textOf)).toEqual(['9', '7', '4']);
    expect(textOf(cards[0]!.querySelector('.rating-avg')!)).toBe('6.7');
    expect(textOf(cards[1]!)).toContain('January 2, 2026');
    // The new review is the active one: the previous one stays, dimmed
    expect(cards.map((c) => c.classList.contains('inactive'))).toEqual([false, true]);

    // ..."Recent" shows only the new one, in place of the previous one
    query(harness.fixture, '.tab-recent').click();
    await harness.fixture.whenStable();
    const recentCards = queryAll(harness.fixture, '.rating-card');
    expect(recentCards).toHaveLength(1);
    expect(textOf(recentCards[0]!)).toContain('October 9, 2026');
  });

  it('locks every review button once the review is saved, one review a day', async () => {
    await openApp('/review/r1');
    await click('.submit-btn');

    // Back on the restaurant page: "New" does not start another review, the search of the tab bar stays open
    expect(url()).toBe('/restaurant/r1');
    const chip = query<HTMLButtonElement>(harness.fixture, '.add-chip');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.disabled).toBe(true);
    expect(query<HTMLButtonElement>(harness.fixture, '.tab-btn-search').disabled).toBe(false);

    // The rating page of another restaurant, opened from its URL, is locked too
    await harness.navigateByUrl('/review/r2');
    await harness.fixture.whenStable();
    expect(queryAll(harness.fixture, '.locked-notice')).toHaveLength(1);
    expect(query<HTMLButtonElement>(harness.fixture, '.submit-btn').disabled).toBe(true);
  });

  it("shows the restaurant's global rating and criteria averages, updated after a new rating", async () => {
    const other = { ...api.ratings[0]!, userId: 'camille', userName: 'Camille' };
    api.ratings.push(
      { ...other, food: 9, service: 6, setting: 3 },
      // A previous rating of Camille, replaced: not counted
      {
        ...other,
        date: '2025-12-01T12:00:00+00:00',
        food: 1,
        service: 1,
        setting: 1,
        isActive: false,
      },
    );

    await openApp('/restaurant/r1');

    // Global rating with one decimal: (5 + 5 + 5 + 9 + 6 + 3) / 6 = 5.5
    expect(textOf(query(harness.fixture, '.global-score'))).toBe('5.5');
    expect(query(harness.fixture, 'span.global-score').title).toBe('Global rating: 5.5/10');
    // Criteria averages rounded to whole numbers: food (5 + 9) / 2, service (5 + 6) / 2 = 5.5, decor (5 + 3) / 2
    expect(queryAll(harness.fixture, '.criteria-averages .criterion-score').map(textOf)).toEqual([
      '7',
      '6',
      '4',
    ]);
    expect(textOf(query(harness.fixture, '.rating-count'))).toBe('2 ratings');

    // A new rating replaces the user's previous one in the averages
    await harness.navigateByUrl('/review/r1');
    await harness.fixture.whenStable();
    const [food, service, decor] = queryAll<HTMLInputElement>(
      harness.fixture,
      'input[type="range"]',
    );
    await setValue(harness.fixture, food!, '9');
    await setValue(harness.fixture, service!, '7');
    await setValue(harness.fixture, decor!, '4');
    await click('.submit-btn');

    // (9 + 7 + 4 + 9 + 6 + 3) / 6 = 6.33
    expect(textOf(query(harness.fixture, '.global-score'))).toBe('6.3');
    // Food 9, service (7 + 6) / 2 = 6.5, decor (4 + 3) / 2 = 3.5: halves rounded up
    expect(queryAll(harness.fixture, '.criteria-averages .criterion-score').map(textOf)).toEqual([
      '9',
      '7',
      '4',
    ]);
  });

  it('shows no global rating while nobody rated the restaurant', async () => {
    api.ratings = [];

    await openApp('/restaurant/r1');

    expect(queryAll(harness.fixture, '.global-score')).toHaveLength(0);
    expect(textOf(query(harness.fixture, '.criteria-averages'))).toContain('No ratings yet');
  });
});
