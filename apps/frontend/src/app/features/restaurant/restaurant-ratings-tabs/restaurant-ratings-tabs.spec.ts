import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { RestaurantRating } from '@/core/models/rating.model';
import { REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { RestaurantRatingsTabs } from './restaurant-ratings-tabs';

/**
 * Builds a rating by `userName` on `date`.
 */
function rating(userName: string, date: string, overrides: Partial<RestaurantRating> = {}) {
  return {
    restaurantId: 'r1',
    userId: userName.toLowerCase(),
    date,
    food: 9,
    service: 6,
    setting: 3,
    bonus: false,
    isActive: true,
    userName,
    userAvatarUrl: null,
    ...overrides,
  } satisfies RestaurantRating;
}

/**
 * Inputs of the tabs.
 */
interface TabsInputs {
  /**
   * Database id of the restaurant
   */
  restaurantId: string;

  /**
   * The logged-in user's ratings
   */
  myRatings: RestaurantRating[];

  /**
   * Recent ratings of every user
   */
  recentRatings: RestaurantRating[];

  /**
   * Recent ratings of the users followed
   */
  followedRatings: RestaurantRating[];

  /**
   * True while the ratings load
   */
  loading: boolean;

  /**
   * True when the ratings could not be loaded
   */
  loadError: boolean;
}

describe('RestaurantRatingsTabs', () => {
  let fixture: ComponentFixture<RestaurantRatingsTabs>;
  let fetchRatingAllowance: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    TestBed.configureTestingModule({
      providers: [
        // The "New" chip needs the router
        provideRouter([]),
        // "Me" (user id "me") is logged in
        { provide: AuthStore, useValue: { loggedInUserId: signal('me') } },
        // The rating allowance locks the "New" chip
        { provide: RatingApi, useValue: { fetchRatingAllowance } },
      ],
    });
  });

  /**
   * Renders the tabs with the given inputs (no rating, nothing loading by default).
   */
  async function render(inputs: Partial<TabsInputs> = {}): Promise<void> {
    fixture = TestBed.createComponent(RestaurantRatingsTabs);
    const all: TabsInputs = {
      restaurantId: 'r1',
      myRatings: [],
      recentRatings: [],
      followedRatings: [],
      loading: false,
      loadError: false,
      ...inputs,
    };
    for (const [name, value] of Object.entries(all)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  /**
   * Changes some inputs of the rendered tabs.
   */
  async function setInputs(inputs: Partial<TabsInputs>): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  /**
   * Opens the "Recent" tab.
   */
  async function openRecentTab(): Promise<void> {
    query(fixture, '.tab-recent').click();
    await fixture.whenStable();
  }

  /**
   * Opens the "Followed" tab.
   */
  async function openFollowedTab(): Promise<void> {
    query(fixture, '.tab-followed').click();
    await fixture.whenStable();
  }

  /**
   * Names of the authors of the cards shown.
   */
  function authorNames(): string[] {
    return queryAll(fixture, '.rating-card .author-name').map(textOf);
  }

  it('links the "New" chip to the rating page of the restaurant', async () => {
    await render();

    const chip = query(fixture, '.add-chip');
    expect(chip.tagName).toBe('A');
    expect(chip.getAttribute('href')).toBe('/review/r1');
    expect(chip.querySelector('app-lock-icon')).toBeNull();
  });

  it('locks the "New" chip once the user reviewed a restaurant today: no link to the rating page', async () => {
    fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
    await render();

    const chip = query<HTMLButtonElement>(fixture, '.add-chip');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.disabled).toBe(true);
    expect(chip.title).toBe(REVIEW_LOCKED_REASON);
    expect(chip.querySelector('app-lock-icon')).not.toBeNull();
    expect(queryAll(fixture, 'a[href="/review/r1"]')).toHaveLength(0);
  });

  it("shows the user's own ratings first, like the recent ones: their author, date and scores", async () => {
    await render({
      myRatings: [
        rating('Me', '2026-03-07T12:00:00+00:00', { bonus: true }),
        rating('Me', '2026-01-02T12:00:00+00:00'),
      ],
      recentRatings: [rating('Camille', '2026-03-08T12:00:00+00:00')],
    });

    const cards = queryAll(fixture, '.rating-card');
    expect(cards).toHaveLength(2);
    expect(authorNames()).toEqual(['Me', 'Me']);
    expect(textOf(cards[0]!.querySelector('.author-avatar')!)).toBe('M');
    expect(textOf(cards[0]!)).toContain('March 7, 2026');
    expect(textOf(cards[0]!)).toContain('💘');
    // The scores under the emojis, and their average (a round 6, without decimal)
    expect(Array.from(cards[0]!.querySelectorAll('.score-value'), textOf)).toEqual(['9', '6', '3']);
    expect(textOf(cards[0]!.querySelector('.rating-avg')!)).toBe('6');
    expect(textOf(cards[1]!)).toContain('January 2, 2026');
    expect(textOf(cards[1]!)).not.toContain('💘');
    expect(textOf(fixture.nativeElement)).not.toContain('Camille');
  });

  it('opens my own profile from my ratings', async () => {
    await render({ myRatings: [rating('Me', '2026-03-07T12:00:00+00:00')] });

    expect(query(fixture, 'a.rating-card').getAttribute('href')).toBe('/profile');
  });

  it('dims my previous ratings, replaced by a more recent one', async () => {
    await render({
      myRatings: [
        rating('Me', '2026-03-07T12:00:00+00:00'),
        rating('Me', '2026-01-02T12:00:00+00:00', { isActive: false }),
      ],
    });

    const cards = queryAll(fixture, '.rating-card');
    expect(cards.map((c) => c.classList.contains('inactive'))).toEqual([false, true]);
    expect(cards.map((c) => c.getAttribute('title'))).toEqual([
      null,
      'Replaced by a more recent rating',
    ]);
  });

  it('shows the recent ratings of every user under "Recent"', async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07T12:00:00+00:00')],
      recentRatings: [
        rating('Camille', '2026-03-08T12:00:00+00:00'),
        rating('Me', '2026-03-07T12:00:00+00:00'),
      ],
    });

    await openRecentTab();

    expect(authorNames()).toEqual(['Camille', 'Me']);
    const cards = queryAll(fixture, '.rating-card');
    expect(textOf(cards[0]!)).toContain('March 8, 2026');
    expect(textOf(cards[0]!.querySelector('.author-avatar')!)).toBe('C');
  });

  it("opens the author's profile from a recent rating, or my own profile from mine", async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07T12:00:00+00:00')],
      recentRatings: [
        rating('Camille', '2026-03-08T12:00:00+00:00'),
        rating('Me', '2026-03-07T12:00:00+00:00'),
      ],
    });

    await openRecentTab();

    expect(queryAll(fixture, 'a.rating-card').map((c) => c.getAttribute('href'))).toEqual([
      '/user/camille',
      '/profile',
    ]);
  });

  it('opens my own profile from my recent rating even when my own ratings are not given', async () => {
    await render({
      recentRatings: [
        rating('Me', '2026-03-07T12:00:00+00:00'),
        rating('Camille', '2026-03-06T12:00:00+00:00'),
      ],
    });

    await openRecentTab();

    expect(queryAll(fixture, 'a.rating-card').map((c) => c.getAttribute('href'))).toEqual([
      '/profile',
      '/user/camille',
    ]);
  });

  it("shows the author's picture when there is one", async () => {
    await render({
      recentRatings: [
        rating('Camille', '2026-03-08T12:00:00+00:00', { userAvatarUrl: 'https://img.test/c.png' }),
      ],
    });

    await openRecentTab();

    expect(query(fixture, 'img.author-avatar').getAttribute('src')).toBe('https://img.test/c.png');
  });

  it('shows the recent ratings of the users followed under "Followed", opening their profile', async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07T12:00:00+00:00')],
      recentRatings: [
        rating('Camille', '2026-03-08T12:00:00+00:00'),
        rating('Stranger', '2026-03-06T12:00:00+00:00'),
      ],
      followedRatings: [
        rating('Camille', '2026-03-08T12:00:00+00:00'),
        rating('Hugo', '2026-02-01T12:00:00+00:00'),
      ],
    });

    await openFollowedTab();

    expect(authorNames()).toEqual(['Camille', 'Hugo']);
    expect(textOf(queryAll(fixture, '.rating-card')[1]!)).toContain('February 1, 2026');
    expect(queryAll(fixture, 'a.rating-card').map((c) => c.getAttribute('href'))).toEqual([
      '/user/camille',
      '/user/hugo',
    ]);
    expect(query(fixture, '.tab-followed').getAttribute('aria-pressed')).toBe('true');
    expect(query(fixture, '.tab-mine').getAttribute('aria-pressed')).toBe('false');
  });

  it('explains when there is no rating in the selected tab', async () => {
    await render({ recentRatings: [rating('Camille', '2026-03-08T12:00:00+00:00')] });

    expect(textOf(fixture.nativeElement)).toContain('No visits yet');

    await openRecentTab();
    expect(textOf(fixture.nativeElement)).not.toContain('No recent visits');

    await setInputs({ recentRatings: [] });
    expect(textOf(fixture.nativeElement)).toContain('No recent visits');

    await openFollowedTab();
    expect(textOf(query(fixture, '.no-visits'))).toBe('Nobody you follow ate here yet 🍽️');
  });

  it('shows the loading state, then the error, instead of an empty list', async () => {
    await render({ loading: true });
    expect(textOf(fixture.nativeElement)).toContain('Loading');
    expect(textOf(fixture.nativeElement)).not.toContain('No visits yet');

    await setInputs({ loading: false, loadError: true });
    expect(textOf(query(fixture, '.load-error'))).toBe("Couldn't load the ratings");
  });
});
