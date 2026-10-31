import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { Restaurant } from '@/core/models/restaurant.model';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import { REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { CAN_REVIEW, alreadyReviewed } from '@/core/review/daily-review-testing';
import { SHARE_NAVIGATOR } from '@/core/share/web-share';
import {
  clickButton,
  query,
  queryAll,
  stubDialogs,
  stubPopovers,
  textOf,
} from '@/testing/dom-testing';

/**
 * Builds the restaurant `id` of the database.
 */
function restaurant(id: string): Restaurant {
  return {
    id,
    name: `Restaurant ${id}`,
    emoji: '🍕',
    address: '1 rue de la Paix',
    description: '',
    lat: 0,
    lng: 0,
  };
}

describe('RestaurantDetail', () => {
  let fetchRestaurantById: ReturnType<typeof vi.fn>;
  let fetchRecentRatings: ReturnType<typeof vi.fn>;
  let fetchRecentFollowedRatings: ReturnType<typeof vi.fn>;
  let fetchMyRatings: ReturnType<typeof vi.fn>;
  let fetchRatingSummary: ReturnType<typeof vi.fn>;
  let fetchRatingAllowance: ReturnType<typeof vi.fn>;
  let deleteMyRating: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn<(data?: ShareData) => Promise<void>>>;
  let shareNavigator: { share?: Navigator['share']; clipboard?: Clipboard };
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // The celebration modals are native dialogs, the actions of a rating a popover
    stubDialogs();
    stubPopovers();
    share = vi.fn(() => Promise.resolve());
    shareNavigator = { share };
    fetchRestaurantById = vi.fn((id: string) => of(restaurant(id)));
    fetchRecentRatings = vi.fn(() => of([]));
    fetchRecentFollowedRatings = vi.fn(() => of([]));
    fetchMyRatings = vi.fn(() => of([]));
    fetchRatingSummary = vi.fn(() =>
      of({ count: 0, food: null, service: null, setting: null, global: null }),
    );
    fetchRatingAllowance = vi.fn(() => of(CAN_REVIEW));
    deleteMyRating = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById,
            fetchRestaurants: () => of([]),
          },
        },
        {
          provide: RatingApi,
          useValue: {
            fetchRecentRatings,
            fetchRecentFollowedRatings,
            fetchMyRatings,
            fetchRatingSummary,
            deleteMyRating,
            // Locks the review buttons
            fetchRatingAllowance,
            // Read by the home page
            fetchUserRatings: () => of([]),
          },
        },
        // Read by the home page
        { provide: UserApi, useValue: { fetchUserProfile: () => of(undefined) } },
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId: () => of([]) } },
        // Web Share API of the browser, read when the "Bravo" modal opens
        { provide: SHARE_NAVIGATOR, useValue: shareNavigator },
      ],
    });
    harness = await RouterTestingHarness.create();
    // Done by the first navigation of the app: the router follows the history (the back button)
    TestBed.inject(Router).setUpLocationChangeListener();
  });

  /**
   * Opens `path` in the app and waits for it to load.
   */
  async function open(path: string): Promise<void> {
    await harness.navigateByUrl(path);
    await harness.fixture.whenStable();
  }

  /**
   * Current path of the app.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  it('shows the restaurant of the database', async () => {
    await open('/restaurant/r1');

    expect(fetchRestaurantById).toHaveBeenCalledWith('r1');
    expect(textOf(query(harness.fixture, '.name'))).toBe('Restaurant r1');
    expect(textOf(query(harness.fixture, '.info-text'))).toBe('1 rue de la Paix');
  });

  it('lists the recent ratings of the users I follow under "Followed"', async () => {
    fetchRecentFollowedRatings.mockReturnValue(
      of([
        {
          restaurantId: 'r1',
          userId: 'camille',
          date: '2026-10-01T12:00:00+00:00',
          food: 8,
          service: 7,
          setting: 6,
          bonus: false,
          isActive: true,
          userName: 'Camille',
          userAvatarUrl: null,
        },
      ]),
    );
    await open('/restaurant/r1');

    query(harness.fixture, '.tab-followed').click();
    await harness.fixture.whenStable();

    expect(fetchRecentFollowedRatings).toHaveBeenCalledWith('r1', 5);
    expect(queryAll(harness.fixture, '.rating-card .author-name').map(textOf)).toEqual(['Camille']);
  });

  it('leaves for the home page when the restaurant does not exist', async () => {
    fetchRestaurantById.mockReturnValue(of(undefined));

    await open('/restaurant/unknown');

    expect(url()).toBe('/');
  });

  it('explains when the restaurant cannot be loaded, and goes back', async () => {
    fetchRestaurantById.mockImplementation((id: string) =>
      id === 'r2' ? throwError(() => new Error('503')) : of(restaurant(id)),
    );
    await open('/restaurant/r1');

    await open('/restaurant/r2');
    expect(textOf(query(harness.fixture, '.load-error p'))).toBe("Couldn't load this restaurant");

    // Going back in the history is asynchronous: wait for the router to follow it
    const navigated = firstValueFrom(
      TestBed.inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)),
    );
    await clickButton(harness.fixture, 'Go back');
    await navigated;
    expect(url()).toBe('/restaurant/r1');
  });

  it('loads the ratings and averages again once I deleted one of my ratings', async () => {
    const myRating = {
      restaurantId: 'r1',
      userId: 'u1',
      date: '2026-10-01T12:00:00+00:00',
      food: 8,
      service: 7,
      setting: 6,
      bonus: false,
      isActive: true,
      userName: 'Alexis Melo',
      userAvatarUrl: null,
    };
    fetchMyRatings.mockReturnValueOnce(of([myRating])).mockReturnValue(of([]));
    await open('/restaurant/r1');

    query(harness.fixture, '.rating-card .actions-btn').click();
    await harness.fixture.whenStable();
    queryAll(harness.fixture, '.actions-item-label')
      .find((label) => textOf(label) === 'Delete this rating')!
      .closest<HTMLElement>('button')!
      .click();
    await harness.fixture.whenStable();
    query(harness.fixture, 'dialog .confirm-btn').click();
    await harness.fixture.whenStable();

    expect(deleteMyRating).toHaveBeenCalledWith('r1', '2026-10-01T12:00:00+00:00');
    expect(fetchMyRatings).toHaveBeenCalledTimes(2);
    expect(fetchRatingSummary).toHaveBeenCalledTimes(2);
    expect(queryAll(harness.fixture, '.rating-card')).toHaveLength(0);
    expect(textOf(query(harness.fixture, '.no-visits'))).toBe('No visits yet 🍽️');
  });

  describe('adding the restaurant to a tierlist', () => {
    /**
     * Rating of the restaurant r1 by the logged-in user, as served by the fake API.
     */
    const myRating = {
      restaurantId: 'r1',
      userId: 'u1',
      date: '2026-10-01T12:00:00+00:00',
      food: 80,
      service: 70,
      setting: 60,
      bonus: false,
      isActive: true,
      userName: 'Alexis Melo',
      userAvatarUrl: null,
    };

    it('is not offered before I rated the restaurant: the API only adds rated restaurants', async () => {
      await open('/restaurant/r1');

      expect(queryAll(harness.fixture, '.add-to-tierlist-btn')).toHaveLength(0);
    });

    it('opens a popup listing my tierlists once I rated the restaurant, closed from its cross', async () => {
      fetchMyRatings.mockReturnValue(of([myRating]));
      await open('/restaurant/r1');

      query(harness.fixture, '.add-to-tierlist-btn').click();
      await harness.fixture.whenStable();
      expect(query<HTMLDialogElement>(harness.fixture, 'dialog').open).toBe(true);
      expect(textOf(query(harness.fixture, 'dialog .title'))).toBe('Add to a tierlist');

      query(harness.fixture, 'dialog .close-btn').click();
      await harness.fixture.whenStable();
      expect(queryAll(harness.fixture, 'dialog')).toHaveLength(0);
    });
  });

  describe('when the user is the first to open the place', () => {
    /**
     * "The explorer" modal; undefined when it is not shown.
     */
    function explorer(): HTMLDialogElement | undefined {
      return queryAll<HTMLDialogElement>(harness.fixture, 'dialog.celebration')[0];
    }

    beforeEach(() => {
      TestBed.inject(CelebrationStore).celebrate('r1', 'explorer');
    });

    it('shows "The explorer" over the restaurant page, loading the restaurant and its ratings once', async () => {
      await open('/restaurant/r1');

      expect(explorer()?.open).toBe(true);
      expect(textOf(query(harness.fixture, '.celebration .title'))).toBe('The explorer');
      expect(textOf(query(harness.fixture, '.celebration .lead'))).toBe(
        'You are the first to look up Restaurant r1',
      );
      expect(textOf(query(harness.fixture, '.celebration .address'))).toBe('1 rue de la Paix');
      // The page under it
      expect(textOf(query(harness.fixture, '.name'))).toBe('Restaurant r1');
      expect(fetchRestaurantById.mock.calls).toEqual([['r1']]);
      expect(fetchRecentRatings).toHaveBeenCalledTimes(1);
      expect(fetchRecentFollowedRatings).toHaveBeenCalledTimes(1);
      expect(fetchMyRatings).toHaveBeenCalledTimes(1);
      expect(fetchRatingSummary).toHaveBeenCalledTimes(1);
    });

    it('opens the rating page from "Leave a review"', async () => {
      await open('/restaurant/r1');

      const review = query(harness.fixture, '.celebration a.primary-btn');
      expect(textOf(review)).toBe('Leave a review');
      expect(review.getAttribute('href')).toBe('/review/r1');
    });

    it('locks "Leave a review" once the user reviewed a restaurant today, still closing from "See the restaurant"', async () => {
      fetchRatingAllowance.mockReturnValue(of(alreadyReviewed()));
      await open('/restaurant/r1');

      const review = query<HTMLButtonElement>(harness.fixture, '.celebration .primary-btn');
      expect(textOf(review)).toBe('Leave a review');
      expect(review.tagName).toBe('BUTTON');
      expect(review.disabled).toBe(true);
      expect(review.title).toBe(REVIEW_LOCKED_REASON);
      expect(review.querySelector('app-lock-icon')).not.toBeNull();
      expect(queryAll(harness.fixture, 'a[href="/review/r1"]')).toHaveLength(0);

      await clickButton(harness.fixture, 'See the restaurant');

      expect(explorer()).toBeUndefined();
    });

    it('closes on the restaurant page from "See the restaurant", for good', async () => {
      await open('/restaurant/r1');

      await clickButton(harness.fixture, 'See the restaurant');

      expect(explorer()).toBeUndefined();
      expect(url()).toBe('/restaurant/r1');
      await open('/');
      await open('/restaurant/r1');
      expect(explorer()).toBeUndefined();
    });

    it('closes from its cross, as "See the restaurant" does', async () => {
      await open('/restaurant/r1');

      query(harness.fixture, '.celebration .close-btn').click();
      await harness.fixture.whenStable();

      expect(explorer()).toBeUndefined();
      expect(url()).toBe('/restaurant/r1');
    });

    it('shows "The explorer" when the place is opened from the page of another restaurant', async () => {
      await open('/restaurant/r1');
      await clickButton(harness.fixture, 'See the restaurant');

      // The search stores r2 then opens its page: the router keeps this page, only its id changes
      TestBed.inject(CelebrationStore).celebrate('r2', 'explorer');
      await open('/restaurant/r2');

      expect(explorer()?.open).toBe(true);
      expect(textOf(query(harness.fixture, '.celebration .lead'))).toBe(
        'You are the first to look up Restaurant r2',
      );
    });
  });

  describe('after the first rating of the restaurant', () => {
    /**
     * The "Bravo" modal; undefined when it is not shown.
     */
    function bravo(): HTMLDialogElement | undefined {
      return queryAll<HTMLDialogElement>(harness.fixture, 'dialog.celebration')[0];
    }

    it('congratulates the user in a modal, which closes with its cross for good', async () => {
      TestBed.inject(CelebrationStore).celebrate('r1', 'first-review');
      await open('/restaurant/r1');

      expect(bravo()?.open).toBe(true);
      expect(textOf(query(harness.fixture, '.celebration .title'))).toBe('Bravo!');
      expect(textOf(query(harness.fixture, '.celebration .lead'))).toBe(
        'You just reviewed Restaurant r1 for the first time',
      );

      query(harness.fixture, '.celebration .close-btn').click();
      await harness.fixture.whenStable();

      expect(bravo()).toBeUndefined();
      expect(textOf(query(harness.fixture, '.name'))).toBe('Restaurant r1');

      // Shown once only
      await open('/');
      await open('/restaurant/r1');
      expect(bravo()).toBeUndefined();
    });

    it('shares the restaurant page through the native share sheet', async () => {
      TestBed.inject(CelebrationStore).celebrate('r1', 'first-review');
      await open('/restaurant/r1');

      await clickButton(harness.fixture, 'Share it');

      expect(share).toHaveBeenCalledWith({
        title: 'Restaurant r1',
        text: 'I just rated Restaurant r1 on FoodRank, have a look!',
        url: `${location.origin}/restaurant/r1`,
      });
    });

    it('copies the link of the restaurant page when the browser cannot share', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      delete shareNavigator.share;
      shareNavigator.clipboard = { writeText } as unknown as Clipboard;
      TestBed.inject(CelebrationStore).celebrate('r1', 'first-review');
      await open('/restaurant/r1');

      expect(textOf(query(harness.fixture, '.copy-status'))).toBe('');
      await clickButton(harness.fixture, 'Copy link');

      expect(writeText).toHaveBeenCalledWith(`${location.origin}/restaurant/r1`);
      expect(textOf(query(harness.fixture, '.copy-status'))).toBe(
        'Link copied! Paste it to your friends.',
      );
      expect(share).not.toHaveBeenCalled();
    });

    it('explains when the link cannot be copied', async () => {
      delete shareNavigator.share;
      shareNavigator.clipboard = {
        writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
      } as unknown as Clipboard;
      TestBed.inject(CelebrationStore).celebrate('r1', 'first-review');
      await open('/restaurant/r1');

      await clickButton(harness.fixture, 'Copy link');

      expect(textOf(query(harness.fixture, '.copy-status'))).toBe("Couldn't copy the link.");
    });

    it('offers neither button when the browser can neither share nor copy', async () => {
      delete shareNavigator.share;
      TestBed.inject(CelebrationStore).celebrate('r1', 'first-review');
      await open('/restaurant/r1');

      expect(bravo()?.open).toBe(true);
      expect(queryAll(harness.fixture, '.share-btn')).toHaveLength(0);
    });

    it('does not congratulate on the page of another restaurant, nor without a rating', async () => {
      await open('/restaurant/r1');
      expect(bravo()).toBeUndefined();

      TestBed.inject(CelebrationStore).celebrate('r2', 'first-review');
      await open('/restaurant/r3');
      expect(bravo()).toBeUndefined();
    });
  });
});
