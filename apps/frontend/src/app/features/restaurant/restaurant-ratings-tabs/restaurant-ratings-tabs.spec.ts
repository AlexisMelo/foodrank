import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { RestaurantRating } from '@/core/models/rating.model';
import { REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { SHARE_NAVIGATOR } from '@/core/share/web-share';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, stubDialogs, stubPopovers, textOf } from '@/testing/dom-testing';
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
   * Name of the restaurant
   */
  restaurantName: string;

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
  let deleteMyRating: ReturnType<typeof vi.fn>;
  let deleteMyRatings: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn<(data?: ShareData) => Promise<void>>>;
  let shareNavigator: { share?: Navigator['share']; clipboard?: Clipboard };

  beforeEach(() => {
    // The actions of a rating are in a popover, the confirmation of a deletion in a dialog
    stubPopovers();
    stubDialogs();
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    deleteMyRating = vi.fn(() => of([]));
    deleteMyRatings = vi.fn(() => of([]));
    share = vi.fn(() => Promise.resolve());
    shareNavigator = { share };
    TestBed.configureTestingModule({
      providers: [
        // The "New" chip needs the router
        provideRouter([]),
        // "Me" (user id "me") is logged in
        { provide: AuthStore, useValue: { loggedInUserId: signal('me') } },
        // The rating allowance locks the "New" chip
        {
          provide: RatingApi,
          useValue: { fetchRatingAllowance, deleteMyRating, deleteMyRatings },
        },
        // Web Share API of the browser, read when the tabs are created
        { provide: SHARE_NAVIGATOR, useValue: shareNavigator },
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
      restaurantName: 'Pizza Roma',
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

    expect(query(fixture, 'a.rating-link').getAttribute('href')).toBe('/profile');
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
    expect(cards.map((c) => c.querySelector('.rating-link')!.getAttribute('title'))).toEqual([
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

    expect(queryAll(fixture, 'a.rating-link').map((c) => c.getAttribute('href'))).toEqual([
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

    expect(queryAll(fixture, 'a.rating-link').map((c) => c.getAttribute('href'))).toEqual([
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
    expect(queryAll(fixture, 'a.rating-link').map((c) => c.getAttribute('href'))).toEqual([
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

  describe('actions of my ratings', () => {
    /**
     * My active rating of March 7 (average 6), and my previous one of January 2.
     */
    const MY_RATINGS = [
      rating('Me', '2026-03-07T12:00:00+00:00'),
      rating('Me', '2026-01-02T12:00:00+00:00', { isActive: false, food: 3 }),
    ];

    /**
     * The host of the actions of the card `index` of the tab shown, holding its button and its menu; null when the
     * card has no actions.
     */
    function actionsOf(index: number): HTMLElement | null {
      return queryAll(fixture, '.rating-card')[index]!.querySelector<HTMLElement>('app-actions');
    }

    /**
     * Opens the menu of the actions of the card `index`, and gives the labels of its actions.
     */
    async function openActions(index: number): Promise<string[]> {
      actionsOf(index)!.querySelector<HTMLElement>('.actions-btn')!.click();
      await fixture.whenStable();
      return Array.from(actionsOf(index)!.querySelectorAll('.actions-item-label')).map(textOf);
    }

    /**
     * Picks the action `label` in the menu of the card `index`, and waits for the tabs to update.
     */
    async function pickAction(index: number, label: string): Promise<void> {
      const position = (await openActions(index)).indexOf(label);
      if (position < 0) throw new Error(`No action ${label} for the card ${index}`);
      actionsOf(index)!.querySelectorAll<HTMLElement>('[role="menuitem"]')[position]!.click();
      await fixture.whenStable();
    }

    /**
     * Clicks the element matching `selector` in the confirmation popup, then waits for the tabs to update.
     */
    async function clickInPopup(selector: string): Promise<void> {
      query(fixture, `dialog ${selector}`).click();
      await fixture.whenStable();
    }

    /**
     * Messages of the toasts shown, with their kind.
     */
    function toasts(): string[] {
      return TestBed.inject(ToastStore)
        .toasts()
        .map((toast) => `${toast.kind}: ${toast.message}`);
    }

    /**
     * Renders my ratings, and counts the times the tabs tell the page they were deleted.
     */
    async function renderMine(
      myRatings: RestaurantRating[] = MY_RATINGS,
    ): Promise<{ deleted: number }> {
      await render({ myRatings });
      const emitted = { deleted: 0 };
      fixture.componentInstance.ratingsDeleted.subscribe(() => emitted.deleted++);
      return emitted;
    }

    it('offers to share each of my ratings, delete it or delete them all, the deletions last', async () => {
      await renderMine();

      expect(await openActions(0)).toEqual(['Share', 'Delete this rating', 'Delete all ratings']);
      expect(await openActions(1)).toEqual(['Share', 'Delete this rating', 'Delete all ratings']);
      expect(query(fixture, '.rating-card .actions-btn').getAttribute('aria-label')).toBe(
        'Actions for the rating of March 7, 2026',
      );
    });

    it('does not offer to delete them all when I have a single rating', async () => {
      await renderMine([rating('Me', '2026-03-07T12:00:00+00:00')]);

      expect(await openActions(0)).toEqual(['Share', 'Delete this rating']);
    });

    it("offers actions on my recent rating only, not on the other users' ratings", async () => {
      await render({
        myRatings: MY_RATINGS,
        recentRatings: [rating('Camille', '2026-03-08T12:00:00+00:00'), MY_RATINGS[0]!],
      });

      await openRecentTab();

      expect(actionsOf(0)).toBeNull();
      expect(await openActions(1)).toEqual(['Share', 'Delete this rating', 'Delete all ratings']);
    });

    it('shares the restaurant page with the score of my rating through the native share sheet', async () => {
      await renderMine();

      await pickAction(0, 'Share');

      expect(share).toHaveBeenCalledWith({
        title: 'Pizza Roma',
        text: 'I gave Pizza Roma 6/10 on FoodRank, have a look!',
        url: `${location.origin}/restaurant/r1`,
      });
    });

    it('copies the link of the restaurant page when the browser cannot share, and confirms it', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      delete shareNavigator.share;
      shareNavigator.clipboard = { writeText } as unknown as Clipboard;
      await renderMine();

      await pickAction(0, 'Copy link');

      expect(writeText).toHaveBeenCalledWith(`${location.origin}/restaurant/r1`);
      expect(toasts()).toEqual(['success: Link copied! Paste it to your friends.']);
    });

    it('deletes my active rating once I confirm, my previous one becoming my score again', async () => {
      const emitted = await renderMine();

      await pickAction(0, 'Delete this rating');

      expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
      expect(textOf(query(fixture, 'dialog .title'))).toBe('Delete this rating?');
      expect(textOf(query(fixture, 'dialog .text'))).toBe(
        'Your rating of March 7, 2026 will be deleted. Your previous one, of January 2, 2026, becomes your score again.',
      );
      expect(deleteMyRating).not.toHaveBeenCalled();

      await clickInPopup('.confirm-btn');

      expect(deleteMyRating).toHaveBeenCalledWith('r1', '2026-03-07T12:00:00+00:00');
      expect(queryAll(fixture, 'dialog')).toHaveLength(0);
      expect(toasts()).toEqual(['success: Rating deleted']);
      expect(emitted.deleted).toBe(1);
      // Deleting the rating of today lets the user review a restaurant again: the allowance is checked again
      expect(fetchRatingAllowance).toHaveBeenCalledTimes(2);
    });

    it('tells that deleting a previous rating does not change my score', async () => {
      await renderMine();

      await pickAction(1, 'Delete this rating');

      expect(textOf(query(fixture, 'dialog .text'))).toBe(
        'Your rating of January 2, 2026 will be deleted. Your current score does not change.',
      );
      await clickInPopup('.confirm-btn');
      expect(deleteMyRating).toHaveBeenCalledWith('r1', '2026-01-02T12:00:00+00:00');
    });

    it('tells that deleting my only rating removes the restaurant from my tierlists', async () => {
      await renderMine([rating('Me', '2026-03-07T12:00:00+00:00')]);

      await pickAction(0, 'Delete this rating');

      expect(textOf(query(fixture, 'dialog .text'))).toBe(
        'Your rating of March 7, 2026 will be deleted. You will have no rating of Pizza Roma left: it will also be removed from your tierlists.',
      );
    });

    it('deletes all my ratings of the restaurant once I confirm', async () => {
      const emitted = await renderMine();

      await pickAction(1, 'Delete all ratings');

      expect(textOf(query(fixture, 'dialog .title'))).toBe('Delete all your ratings?');
      expect(textOf(query(fixture, 'dialog .text'))).toBe(
        'Your 2 ratings of Pizza Roma will be deleted. It will also be removed from your tierlists.',
      );
      await clickInPopup('.confirm-btn');

      expect(deleteMyRatings).toHaveBeenCalledWith('r1');
      expect(deleteMyRating).not.toHaveBeenCalled();
      expect(queryAll(fixture, 'dialog')).toHaveLength(0);
      expect(toasts()).toEqual(['success: Ratings deleted']);
      expect(emitted.deleted).toBe(1);
    });

    it('keeps my ratings when I cancel', async () => {
      const emitted = await renderMine();
      await pickAction(0, 'Delete this rating');

      await clickInPopup('.cancel-btn');

      expect(queryAll(fixture, 'dialog')).toHaveLength(0);
      expect(deleteMyRating).not.toHaveBeenCalled();
      expect(emitted.deleted).toBe(0);
    });

    it('keeps the popup open and explains when the deletion fails', async () => {
      deleteMyRatings.mockReturnValue(throwError(() => new Error('503')));
      const emitted = await renderMine();
      await pickAction(0, 'Delete all ratings');

      await clickInPopup('.confirm-btn');

      expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
      expect(textOf(query(fixture, 'dialog .error'))).toBe(
        "Couldn't delete your ratings, try again.",
      );
      expect(toasts()).toEqual([]);
      expect(emitted.deleted).toBe(0);
    });
  });
});
