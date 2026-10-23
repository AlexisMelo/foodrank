import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { AuthStore } from '@/core/auth/auth-store';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { UserRating } from '@/core/models/rating.model';
import { query, queryAll, setValue, textOf } from '@/testing/dom-testing';
import { NewReview } from './new-review';

/**
 * Empty page standing for the restaurant and home pages, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the error HttpClient gives when the API answers with `status`.
 */
function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

/**
 * Builds an active rating of `restaurantId` with these criteria scores.
 */
function rating(restaurantId: string, food: number, service: number, setting: number): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍔',
    restaurantCuisine: '',
    date: '2026-10-01',
    food,
    service,
    setting,
    bonus: false,
    isActive: true,
  };
}

describe('NewReview', () => {
  let rateRestaurant: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let fetchRestaurantById: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    rateRestaurant = vi.fn();
    fetchUserRatings = vi.fn(() => of([]));
    fetchRestaurantById = vi.fn(() => of({ id: 'r1', name: 'Pizza Roma', emoji: '🍕' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'review/:id', component: NewReview },
            { path: '**', component: StubPage },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        { provide: RestaurantApi, useValue: { fetchRestaurantById } },
        { provide: RatingApi, useValue: { fetchUserRatings, rateRestaurant } },
      ],
    });
  });

  /**
   * Opens the rating page of r1 and waits for the restaurant to be loaded.
   */
  async function openPage(): Promise<void> {
    harness = await RouterTestingHarness.create('/review/r1');
    await harness.fixture.whenStable();
  }

  /**
   * Clicks the element matching `selector`, then waits for the page to update.
   */
  async function click(selector: string): Promise<void> {
    query(harness.fixture, selector).click();
    await harness.fixture.whenStable();
  }

  it('leaves for the home page when the restaurant does not exist', async () => {
    fetchRestaurantById.mockReturnValue(of(undefined));
    await openPage();

    expect(fetchRestaurantById).toHaveBeenCalledWith('r1');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(rateRestaurant).not.toHaveBeenCalled();
  });

  it('explains when the restaurant cannot be loaded, and links back to the restaurant page', async () => {
    fetchRestaurantById.mockReturnValue(throwError(() => httpError(503)));
    await openPage();

    expect(textOf(query(harness.fixture, '[role="alert"]'))).toBe(
      "Couldn't load this restaurant, try again later.",
    );
    expect(queryAll(harness.fixture, 'input[type="range"]')).toHaveLength(0);
    expect(query(harness.fixture, '.back-btn').getAttribute('href')).toBe('/restaurant/r1');

    await click('.back-btn');

    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('still rates the restaurant when the past reviews cannot be loaded, telling they are missing', async () => {
    fetchUserRatings.mockReturnValue(throwError(() => httpError(503)));
    rateRestaurant.mockReturnValue(of(undefined));
    await openPage();

    expect(textOf(query(harness.fixture, '.past-reviews-error'))).toBe(
      "Couldn't load your past reviews, the sliders show no landmarks.",
    );
    expect(queryAll(harness.fixture, '.marker:not(.threshold-marker)')).toHaveLength(0);

    await click('.submit-btn');

    expect(rateRestaurant).toHaveBeenCalledWith('r1', {
      food: 50,
      service: 50,
      setting: 50,
      bonus: false,
    });
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('saves the slider values and the instant crush, then opens the restaurant page', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    await openPage();

    const [food, service, decor] = queryAll<HTMLInputElement>(
      harness.fixture,
      'input[type="range"]',
    );
    await setValue(harness.fixture, food!, '80');
    await setValue(harness.fixture, service!, '35');
    await setValue(harness.fixture, decor!, '12');
    await click('.crush-toggle');
    await click('.submit-btn');

    expect(rateRestaurant).toHaveBeenCalledWith('r1', {
      food: 80,
      service: 35,
      setting: 12,
      bonus: true,
    });
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('asks the restaurant page to congratulate the user after their first rating of it', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    // Only other restaurants rated so far
    fetchUserRatings.mockReturnValue(of([rating('r2', 70, 60, 50)]));
    await openPage();

    await click('.submit-btn');

    expect(TestBed.inject(CelebrationStore).pending()).toEqual({
      restaurantId: 'r1',
      kind: 'first-review',
    });
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('does not congratulate a user who already rated the restaurant', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    fetchUserRatings.mockReturnValue(of([{ ...rating('r1', 70, 60, 50), isActive: false }]));
    await openPage();

    await click('.submit-btn');

    expect(TestBed.inject(CelebrationStore).pending()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('does not congratulate when the past ratings cannot be loaded', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    fetchUserRatings.mockReturnValue(throwError(() => httpError(503)));
    await openPage();

    await click('.submit-btn');

    expect(TestBed.inject(CelebrationStore).pending()).toBeNull();
  });

  it('stays on the page and explains when the restaurant was already rated today', async () => {
    rateRestaurant.mockReturnValue(throwError(() => httpError(409)));
    await openPage();

    await click('.submit-btn');

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'You already rated this restaurant today.',
    );
    expect(TestBed.inject(Router).url).toBe('/review/r1');
    // The rating can be sent again
    expect(query<HTMLButtonElement>(harness.fixture, '.submit-btn').disabled).toBe(false);
  });

  it('shows a generic error when the API fails', async () => {
    rateRestaurant.mockReturnValue(throwError(() => httpError(503)));
    await openPage();

    await click('.submit-btn');

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'Could not save your rating, try again.',
    );
  });

  it('disables the button while saving, so the rating is not sent twice', async () => {
    const save = new Subject<void>();
    rateRestaurant.mockReturnValue(save);
    await openPage();

    await click('.submit-btn');
    expect(query<HTMLButtonElement>(harness.fixture, '.submit-btn').disabled).toBe(true);
    await click('.submit-btn');

    save.next();
    save.complete();
    // Lets the page receive the answer (it starts the navigation), then waits for the navigation
    await Promise.resolve();
    await harness.fixture.whenStable();
    expect(rateRestaurant).toHaveBeenCalledOnce();
    // The real router leaves the page once saved (the button state is checked by the 409 test)
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it("shows the user's past reviews under the sliders, with their score of each criterion", async () => {
    fetchUserRatings.mockReturnValue(
      of([
        rating('a', 20, 50, 80),
        rating('b', 52, 75, 21),
        // A previous rating, replaced by the active one: not shown
        { ...rating('a', 78, 78, 78), date: '2026-01-01', isActive: false },
      ]),
    );
    await openPage();

    expect(fetchUserRatings).toHaveBeenCalledWith();
    /**
     * Names of the past reviews shown under the slider at `index`, from left to right.
     */
    const markers = (index: number) =>
      Array.from(
        queryAll(harness.fixture, '.markers-overlay')[index]!.querySelectorAll(
          '.marker:not(.threshold-marker) .marker-name',
        ),
        textOf,
      );
    // Food: 22 → a, 50 → b; service: 50 → a, 78 → b; decor (the API's setting): 22 → b, 78 → a
    expect(markers(0)).toEqual(['Restaurant a', 'Restaurant b']);
    expect(markers(1)).toEqual(['Restaurant a', 'Restaurant b']);
    expect(markers(2)).toEqual(['Restaurant b', 'Restaurant a']);
  });

  it('leaves the restaurant being rated out of the past reviews, only the other ones are shown', async () => {
    // r1 is the restaurant being rated: alone at 78, it would be shown under every slider
    fetchUserRatings.mockReturnValue(of([rating('r1', 78, 78, 78), rating('b', 50, 50, 50)]));
    await openPage();

    const names = queryAll(harness.fixture, '.marker:not(.threshold-marker) .marker-name').map(
      textOf,
    );
    expect(names).toEqual(['Restaurant b', 'Restaurant b', 'Restaurant b']);
  });
});
