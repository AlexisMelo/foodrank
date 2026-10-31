import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { AuthStore } from '@/core/auth/auth-store';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, setValue, stubDialogs, textOf, typeIn } from '@/testing/dom-testing';
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
    restaurantAddress: '',
    date: '2026-10-01T12:00:00+00:00',
    food,
    service,
    setting,
    bonus: false,
    isActive: true,
  };
}

/**
 * Builds the tierlist `id` of the logged-in user named `name`, last updated on `updatedDay` of October 2026, holding
 * `restaurantIds`.
 */
function tierlist(
  id: number,
  name: string,
  updatedDay: number,
  restaurantIds: string[] = [],
): Tierlist {
  return {
    id,
    userId: 'u1',
    name,
    description: null,
    emoji: '🏆',
    restaurants: restaurantIds.map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: `2026-10-${String(updatedDay).padStart(2, '0')}T10:00:00Z`,
    pinned: false,
  };
}

describe('NewReview', () => {
  let rateRestaurant: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let fetchRatingAllowance: ReturnType<typeof vi.fn>;
  let fetchRestaurantById: ReturnType<typeof vi.fn>;
  let fetchTierlistsByUserId: ReturnType<typeof vi.fn>;
  let addRestaurantToTierlist: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    rateRestaurant = vi.fn();
    fetchUserRatings = vi.fn(() => of([]));
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    fetchRestaurantById = vi.fn(() => of({ id: 'r1', name: 'Pizza Roma', emoji: '🍕' }));
    // No tierlist by default: the page shows no tierlist chip
    fetchTierlistsByUserId = vi.fn(() => of([]));
    addRestaurantToTierlist = vi.fn();
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
        {
          provide: RatingApi,
          useValue: { fetchUserRatings, fetchRatingAllowance, rateRestaurant },
        },
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId, addRestaurantToTierlist } },
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

  it('shows the address of the restaurant under its name, when it is known', async () => {
    fetchRestaurantById.mockReturnValue(
      of({
        id: 'r1',
        name: 'Pizza Roma',
        emoji: '🍕',
        address: '1 rue de Caen',
      }),
    );
    await openPage();

    expect(textOf(query(harness.fixture, '.restaurant-name'))).toBe('Pizza Roma');
    expect(textOf(query(harness.fixture, '.restaurant-address'))).toBe('1 rue de Caen');
  });

  it('shows no line under the name of a restaurant without address', async () => {
    await openPage();

    expect(queryAll(harness.fixture, '.restaurant-address')).toHaveLength(0);
  });

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
      food: 5,
      service: 5,
      setting: 5,
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
    await setValue(harness.fixture, food!, '8');
    await setValue(harness.fixture, service!, '4');
    await setValue(harness.fixture, decor!, '2');
    await click('.crush-toggle');
    await click('.submit-btn');

    expect(rateRestaurant).toHaveBeenCalledWith('r1', {
      food: 8,
      service: 4,
      setting: 2,
      bonus: true,
    });
    expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
  });

  it('rates each criterion with one of the 10 whole scores from 1 to 10, starting at 5', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    await openPage();

    const sliders = queryAll<HTMLInputElement>(harness.fixture, 'input[type="range"]');
    expect(sliders.map((s) => [s.min, s.max, s.step, s.value])).toEqual([
      ['1', '10', '1', '5'],
      ['1', '10', '1', '5'],
      ['1', '10', '1', '5'],
    ]);
    expect(queryAll(harness.fixture, '.rating-chip').map(textOf)).toEqual(['Good', 'Good', 'Good']);

    // The browser keeps the value within the bounds of the slider
    const [food, service, decor] = sliders;
    await setValue(harness.fixture, food!, '0');
    await setValue(harness.fixture, service!, '50');
    await setValue(harness.fixture, decor!, '10');
    await click('.submit-btn');

    expect(rateRestaurant).toHaveBeenCalledWith('r1', {
      food: 1,
      service: 10,
      setting: 10,
      bonus: false,
    });
  });

  it('asks the restaurant page to congratulate the user after their first rating of it', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    // Only other restaurants rated so far
    fetchUserRatings.mockReturnValue(of([rating('r2', 7, 6, 5)]));
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
    fetchUserRatings.mockReturnValue(of([{ ...rating('r1', 7, 6, 5), isActive: false }]));
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

  it('is locked once the user reviewed a restaurant today: it says why and does not save', async () => {
    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
    await openPage();

    expect(textOf(query(harness.fixture, '.locked-notice'))).toBe(REVIEW_LOCKED_REASON);
    const submit = query<HTMLButtonElement>(harness.fixture, '.submit-btn');
    expect(submit.disabled).toBe(true);
    expect(submit.querySelector('app-lock-icon')).not.toBeNull();

    await click('.submit-btn');

    expect(rateRestaurant).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/review/r1');
  });

  it('asks the rating allowance again once saved, so the review buttons lock', async () => {
    rateRestaurant.mockReturnValue(of(undefined));
    await openPage();
    expect(queryAll(harness.fixture, '.locked-notice')).toHaveLength(0);
    expect(fetchRatingAllowance).toHaveBeenCalledOnce();

    await click('.submit-btn');

    expect(fetchRatingAllowance).toHaveBeenCalledTimes(2);
  });

  it('stays on the page and locks it when the API says a restaurant was already reviewed today', async () => {
    rateRestaurant.mockReturnValue(throwError(() => httpError(409)));
    await openPage();
    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));

    await click('.submit-btn');

    expect(TestBed.inject(Router).url).toBe('/review/r1');
    expect(textOf(query(harness.fixture, '.locked-notice'))).toBe(REVIEW_LOCKED_REASON);
    expect(query<HTMLButtonElement>(harness.fixture, '.submit-btn').disabled).toBe(true);
    // The notice says it already
    expect(queryAll(harness.fixture, '.save-error')).toHaveLength(0);
  });

  it('explains a 409 when the rating allowance cannot be loaded again', async () => {
    rateRestaurant.mockReturnValue(throwError(() => httpError(409)));
    await openPage();
    fetchRatingAllowance.mockReturnValue(throwError(() => httpError(503)));

    await click('.submit-btn');

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'You already reviewed a restaurant today.',
    );
    expect(TestBed.inject(Router).url).toBe('/review/r1');
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
        rating('a', 3, 5, 8),
        rating('b', 5, 8, 3),
        // A previous rating, replaced by the active one: not shown
        { ...rating('a', 8, 8, 8), date: '2026-01-01T12:00:00+00:00', isActive: false },
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
    // Food: 3 → a, 5.5 → b; service: 5.5 → a, 8 → b; decor (the API's setting): 3 → b, 8 → a
    expect(markers(0)).toEqual(['Restaurant a', 'Restaurant b']);
    expect(markers(1)).toEqual(['Restaurant a', 'Restaurant b']);
    expect(markers(2)).toEqual(['Restaurant b', 'Restaurant a']);
  });

  it('leaves the restaurant being rated out of the past reviews, only the other ones are shown', async () => {
    // r1 is the restaurant being rated: alone at 8, it would be shown under every slider
    fetchUserRatings.mockReturnValue(of([rating('r1', 8, 8, 8), rating('b', 5, 5, 5)]));
    await openPage();

    const names = queryAll(harness.fixture, '.marker:not(.threshold-marker) .marker-name').map(
      textOf,
    );
    expect(names).toEqual(['Restaurant b', 'Restaurant b', 'Restaurant b']);
  });

  describe('adding the restaurant to tierlists', () => {
    beforeEach(() => {
      // The search popup is a native dialog
      stubDialogs();
      rateRestaurant.mockReturnValue(of(undefined));
      // "Pizza places" already holds r1, the restaurant being rated; "Old favorites" is the least recently updated
      fetchTierlistsByUserId.mockReturnValue(
        of([
          tierlist(1, 'Top 10', 20, ['r2']),
          tierlist(2, 'Date night', 25),
          tierlist(3, 'Pizza places', 10, ['r1']),
          tierlist(4, 'Old favorites', 5),
        ]),
      );
      addRestaurantToTierlist.mockImplementation((id: number) => of(tierlist(id, 'Saved', 26)));
    });

    /**
     * The chip of the tierlist named `name`.
     */
    function chip(name: string): HTMLButtonElement {
      const found = queryAll<HTMLButtonElement>(harness.fixture, '.tierlist-chip').find((c) =>
        textOf(c).includes(name),
      );
      if (!found) throw new Error(`No chip for ${name}`);
      return found;
    }

    /**
     * Clicks the chip of the tierlist named `name`, then waits for the page to update.
     */
    async function toggle(name: string): Promise<void> {
      chip(name).click();
      await harness.fixture.whenStable();
    }

    /**
     * Messages of the toasts shown.
     */
    function toastMessages(): string[] {
      return TestBed.inject(ToastStore)
        .toasts()
        .map((toast) => toast.message);
    }

    it('offers as chips, after the search chip, the 2 most recently updated tierlists the restaurant can be added to', async () => {
      await openPage();

      expect(textOf(queryAll(harness.fixture, '.tierlist-chip')[0]!)).toBe('🔍 Search');
      // "Pizza places" already holds the restaurant, "Old favorites" is older than the two shown
      expect(queryAll(harness.fixture, '.tierlist-chip-name').map(textOf)).toEqual([
        'Date night',
        'Top 10',
      ]);
      expect(chip('Date night').getAttribute('aria-pressed')).toBe('false');
      expect(chip('Top 10').getAttribute('aria-pressed')).toBe('false');
    });

    it('adds the restaurant to the selected tierlists once the rating is saved, then opens the restaurant page', async () => {
      await openPage();

      await toggle('Date night');
      await toggle('Top 10');
      await toggle('Top 10');
      expect(chip('Date night').getAttribute('aria-pressed')).toBe('true');
      expect(chip('Top 10').getAttribute('aria-pressed')).toBe('false');
      expect(addRestaurantToTierlist).not.toHaveBeenCalled();

      await click('.submit-btn');

      expect(addRestaurantToTierlist.mock.calls).toEqual([[2, 'r1']]);
      expect(rateRestaurant.mock.invocationCallOrder[0]).toBeLessThan(
        addRestaurantToTierlist.mock.invocationCallOrder[0]!,
      );
      expect(toastMessages()).toEqual([]);
      expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
    });

    it('lists every tierlist in the search popup, a padlock on the ones holding the restaurant', async () => {
      await openPage();

      await click('.tierlist-search-chip');

      expect(queryAll(harness.fixture, 'dialog .search-row-name').map(textOf)).toEqual([
        'Date night',
        'Top 10',
        'Pizza places',
        'Old favorites',
      ]);
      const lock = query(harness.fixture, 'dialog .select-lock');
      expect(lock.getAttribute('aria-label')).toBe('Already in Pizza places');
      expect(lock.querySelector('app-lock-icon')).not.toBeNull();
      expect(lock.closest('.search-row')!.querySelector('.select-check')).toBeNull();
      expect(queryAll(harness.fixture, 'dialog .select-check')).toHaveLength(3);
    });

    it('selects the tierlists from the search popup too, a tierlist selected there showing as a chip', async () => {
      await openPage();
      await toggle('Top 10');

      await click('.tierlist-search-chip');
      /**
       * Checkboxes of the tierlists listed in the popup, in order.
       */
      const checkboxes = () => queryAll<HTMLInputElement>(harness.fixture, 'dialog .select-check');
      // Date night, Top 10 (selected from its chip) and Old favorites; Pizza places has a padlock
      expect(checkboxes().map((c) => c.checked)).toEqual([false, true, false]);

      await typeIn(harness.fixture, 'dialog .search', 'old');
      expect(queryAll(harness.fixture, 'dialog .search-row-name').map(textOf)).toEqual([
        'Old favorites',
      ]);
      checkboxes()[0]!.click();
      await harness.fixture.whenStable();
      await click('.done-btn');

      expect(queryAll(harness.fixture, 'dialog')).toHaveLength(0);
      expect(queryAll(harness.fixture, '.tierlist-chip-name').map(textOf)).toEqual([
        'Date night',
        'Top 10',
        'Old favorites',
      ]);
      expect(chip('Old favorites').getAttribute('aria-pressed')).toBe('true');

      await click('.submit-btn');

      expect(addRestaurantToTierlist.mock.calls).toEqual([
        [1, 'r1'],
        [4, 'r1'],
      ]);
    });

    it('keeps the rating when the restaurant cannot be added to a tierlist, naming it in a toast', async () => {
      addRestaurantToTierlist.mockImplementation((id: number) =>
        // Top 10 already holds it (409): nothing to report
        throwError(() => httpError(id === 1 ? 409 : 503)),
      );
      await openPage();
      await toggle('Date night');
      await toggle('Top 10');

      await click('.submit-btn');

      expect(toastMessages()).toEqual(["Couldn't add Pizza Roma to Date night."]);
      expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
    });

    it('adds nothing when the rating cannot be saved', async () => {
      rateRestaurant.mockReturnValue(throwError(() => httpError(503)));
      await openPage();
      await toggle('Date night');

      await click('.submit-btn');

      expect(addRestaurantToTierlist).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/review/r1');
    });

    it('disables the chips once the user reviewed a restaurant today', async () => {
      fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
      await openPage();

      // The search chip and the 2 tierlists
      const chips = queryAll<HTMLButtonElement>(harness.fixture, '.tierlist-chip');
      expect(chips.map((c) => c.disabled)).toEqual([true, true, true]);
    });

    it('still rates the restaurant when my tierlists cannot be loaded, telling it cannot be added to them', async () => {
      fetchTierlistsByUserId.mockReturnValue(throwError(() => httpError(503)));
      await openPage();

      expect(textOf(query(harness.fixture, '.tierlists-error'))).toBe(
        "Couldn't load your tierlists, the restaurant can't be added to them.",
      );
      expect(queryAll(harness.fixture, '.tierlist-chip')).toHaveLength(0);

      await click('.submit-btn');

      expect(rateRestaurant).toHaveBeenCalledOnce();
      expect(TestBed.inject(Router).url).toBe('/restaurant/r1');
    });

    it('shows no tierlist chip when I have no tierlist', async () => {
      fetchTierlistsByUserId.mockReturnValue(of([]));
      await openPage();

      expect(queryAll(harness.fixture, '.tierlist-chips')).toHaveLength(0);
      expect(queryAll(harness.fixture, '.tierlists-error')).toHaveLength(0);
    });
  });
});
