import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { AuthStore } from '@/core/auth/auth-store';
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

describe('NewReview', () => {
  let rateRestaurant: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    rateRestaurant = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'review/:id', component: NewReview },
            { path: '**', component: StubPage },
          ],
          withComponentInputBinding(),
        ),
        { provide: AuthStore, useValue: { isLoggedIn: signal(true), currentUserId: 'alex' } },
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById: () => of({ id: 'r1', name: 'Pizza Roma', emoji: '🍕' }),
            fetchRestaurants: () => of([]),
          },
        },
        {
          provide: RatingApi,
          useValue: { fetchCommunityVisitsByUserId: () => of([]), rateRestaurant },
        },
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

  it('asks to log in when the session expired', async () => {
    rateRestaurant.mockReturnValue(throwError(() => httpError(401)));
    await openPage();

    await click('.submit-btn');

    expect(textOf(query(harness.fixture, '.save-error'))).toBe('Log in to rate this restaurant.');
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
    // The real router leaves the page once saved (the Vue test checked the button again: see the 409 test)
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });
});
