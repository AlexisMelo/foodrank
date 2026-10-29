import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import type { UserProfile } from '@/core/models/user.model';
import { CAN_REVIEW } from '@/core/review/daily-review-testing';
import { SHARE_NAVIGATOR } from '@/core/share/web-share';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, stubDialogs, stubPopovers, textOf } from '@/testing/dom-testing';

/**
 * Profiles served by the fake API, by user id; the logged-in user is u1
 */
const profiles: Record<string, UserProfile> = {
  u1: {
    id: 'u1',
    username: 'alexis.melo',
    displayName: 'Alexis Melo',
    avatarUrl: null,
    ratedRestaurantsCount: 1,
  },
  u2: {
    id: 'u2',
    username: 'camille',
    displayName: 'Camille',
    avatarUrl: null,
    ratedRestaurantsCount: 2,
  },
};

/**
 * Builds a rating of `restaurantId` given at `date`, with the same score for the three criteria.
 */
function rating(
  restaurantId: string,
  score: number,
  date = '2026-03-07T12:00:00+00:00',
): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantAddress: `${restaurantId} street, Caen`,
    date,
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive: true,
  };
}

/**
 * Ratings served by the fake API, by user id
 */
const ratings: Record<string, UserRating[]> = {
  me: [rating('r1', 40)],
  u1: [rating('r1', 40)],
  u2: [rating('r1', 60), rating('r2', 90), rating('elsewhere', 100)],
};

/**
 * Builds a tierlist of `userId` holding r1 and r2.
 */
function tierlistOf(userId: string): Tierlist {
  return {
    id: 7,
    userId,
    name: 'Date night',
    description: 'Candles and good wine',
    emoji: '🕯️',
    restaurants: ['r1', 'r2'].map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned: true,
  };
}

describe('TierlistDetailView', () => {
  let fetchTierlistById: ReturnType<typeof vi.fn>;
  let setTierlistPinned: ReturnType<typeof vi.fn>;
  let removeRestaurantFromTierlist: ReturnType<typeof vi.fn>;
  let addRestaurantToTierlist: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn<(data?: ShareData) => Promise<void>>>;
  let shareNavigator: { share?: Navigator['share']; clipboard?: Clipboard };
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // The removal is confirmed, and the restaurants are added, in native dialogs; the actions of a restaurant are in
    // a popover
    stubDialogs();
    stubPopovers();
    share = vi.fn(() => Promise.resolve());
    shareNavigator = { share };
    fetchTierlistById = vi.fn();
    setTierlistPinned = vi.fn();
    removeRestaurantFromTierlist = vi.fn();
    addRestaurantToTierlist = vi.fn();
    fetchUserRatings = vi.fn((id = 'me') => of(ratings[id] ?? []));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        // The real routes, with u1 logged in
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        {
          provide: TierlistApi,
          // The tierlists page is opened for an unknown tierlist
          useValue: {
            fetchTierlistById,
            setTierlistPinned,
            removeRestaurantFromTierlist,
            addRestaurantToTierlist,
            fetchTierlistsByUserId: () => of([]),
          },
        },
        { provide: UserApi, useValue: { fetchUserProfile: (id: string) => of(profiles[id]) } },
        // The rating allowance locks the "+" of the restaurants of a ranking
        {
          provide: RatingApi,
          useValue: { fetchUserRatings, fetchRatingAllowance: () => of(CAN_REVIEW) },
        },
        // The restaurant page, opened from the actions of a restaurant, cannot load it
        {
          provide: RestaurantApi,
          useValue: { fetchRestaurantById: () => throwError(() => new Error('503')) },
        },
        // Web Share API of the browser, read when the page opens
        { provide: SHARE_NAVIGATOR, useValue: shareNavigator },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /**
   * Opens the page of tierlist 7, and waits for it to load.
   */
  async function openTierlist(): Promise<void> {
    await harness.navigateByUrl('/tierlists/7');
    await harness.fixture.whenStable();
  }

  /**
   * The host of the actions of the restaurant named `name`, holding its button and its menu.
   */
  function actionsOf(name: string): HTMLElement {
    return query(harness.fixture, `button[aria-label="Actions for ${name}"]`).closest<HTMLElement>(
      'app-actions',
    )!;
  }

  /**
   * Opens the menu of the actions of the restaurant named `name`, and gives the labels of its actions.
   */
  async function openActions(name: string): Promise<string[]> {
    actionsOf(name).querySelector<HTMLElement>('.actions-btn')!.click();
    await harness.fixture.whenStable();
    return Array.from(actionsOf(name).querySelectorAll('.actions-item-label')).map(textOf);
  }

  /**
   * Picks the action `label` in the menu of the restaurant named `name`, and waits for the page to update.
   */
  async function pickAction(name: string, label: string): Promise<void> {
    const index = (await openActions(name)).indexOf(label);
    if (index < 0) throw new Error(`No action ${label} for ${name}`);
    actionsOf(name).querySelectorAll<HTMLElement>('[role="menuitem"]')[index]!.click();
    await harness.fixture.whenStable();
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
   * Names of the restaurants of the page's list, in order.
   */
  function listedRestaurants(): string[] {
    return queryAll(harness.fixture, '.list-item').map((i) =>
      textOf(i.querySelector('.item-name')!),
    );
  }

  /**
   * Clicks the sort chip of the page whose text is `label`, and waits for the list to update.
   */
  async function sortBy(label: string): Promise<void> {
    queryAll(harness.fixture, '.choice-chip')
      .find((chip) => textOf(chip) === label)!
      .click();
    await harness.fixture.whenStable();
  }

  /**
   * Clicks the pin button, and waits for the change to be saved.
   */
  async function clickPin(): Promise<void> {
    query(harness.fixture, '.pin-btn').click();
    await harness.fixture.whenStable();
  }

  it("shows the tierlist and its owner, its restaurants ranked by the owner's ratings", async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    expect(fetchTierlistById).toHaveBeenCalledWith('7');
    expect(textOf(query(harness.fixture, '.title'))).toBe('Date night');
    expect(textOf(query(harness.fixture, '.description'))).toBe('Candles and good wine');
    expect(textOf(query(harness.fixture, '.hero .owner-name'))).toBe('Camille');
    expect(query(harness.fixture, '.hero .owner').getAttribute('href')).toBe('/user/u2');
    expect(textOf(query(harness.fixture, '.hero .meta-chip'))).toBe('2 restaurants');
    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r2',
      'Restaurant r1',
    ]);
    expect(textOf(items[0]!.querySelector('.item-avg')!)).toBe('90');
  });

  it('sorts the restaurants by score, the default, by the moment of their rating or by name', async () => {
    // r1 has the lowest score but was rated last
    fetchUserRatings.mockImplementation((id = 'me') =>
      of(
        id === 'u2'
          ? [rating('r1', 60, '2026-10-20T12:00:00+00:00'), rating('r2', 90)]
          : (ratings[id] ?? []),
      ),
    );
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    const chips = queryAll(harness.fixture, '.choice-chip');
    expect(chips.map(textOf)).toEqual(['Score', 'Recently rated', 'A–Z']);
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(listedRestaurants()).toEqual(['Restaurant r2', 'Restaurant r1']);

    await sortBy('Recently rated');
    expect(listedRestaurants()).toEqual(['Restaurant r1', 'Restaurant r2']);

    await sortBy('Score');
    expect(listedRestaurants()).toEqual(['Restaurant r2', 'Restaurant r1']);

    await sortBy('A–Z');
    expect(listedRestaurants()).toEqual(['Restaurant r1', 'Restaurant r2']);
  });

  it("offers no sort for someone else's empty tierlist, nor an empty row", async () => {
    fetchTierlistById.mockReturnValue(of({ ...tierlistOf('u2'), restaurants: [] }));
    await openTierlist();

    expect(queryAll(harness.fixture, '.list-toolbar')).toHaveLength(0);
  });

  it('shows the address of each restaurant under its name', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    expect(queryAll(harness.fixture, '.list-item .item-sub').map(textOf)).toEqual([
      'r2 street, Caen',
      'r1 street, Caen',
    ]);
  });

  it("shows my own score on someone else's tierlist, without letting me pin it", async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    const r1 = queryAll(harness.fixture, '.list-item').find((i) =>
      textOf(i).includes('Restaurant r1'),
    )!;
    expect(textOf(r1.querySelector('.my-score')!)).toBe('40');
    expect(queryAll(harness.fixture, '.pin-btn')).toHaveLength(0);
    expect(fetchUserRatings.mock.calls).toEqual([['u2'], ['me']]);
  });

  it("links the restaurants I never rated on someone else's tierlist to their rating page, as on a profile", async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
    await openTierlist();

    /**
     * The item of the restaurant named `name`.
     */
    const item = (name: string) =>
      queryAll(harness.fixture, '.list-item').find((i) => textOf(i).includes(name))!;
    expect(item('Restaurant r2').querySelector('.my-score-rate')!.getAttribute('href')).toBe(
      '/review/r2',
    );
    // Rated by me: my score instead
    expect(item('Restaurant r1').querySelector('.my-score-rate')).toBeNull();
  });

  it('offers no "+" on my own tierlist, every restaurant of it being rated by me', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(queryAll(harness.fixture, '.my-score-rate')).toHaveLength(0);
  });

  it('lets the owner pin their tierlist, without showing their score twice', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
  });

  it('requests my ratings once on my own tierlist, as its owner', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(fetchUserRatings.mock.calls).toEqual([['u1']]);
    expect(textOf(query(harness.fixture, '.item-name'))).toBe('Restaurant r1');
  });

  it('saves the pin when the owner unpins then pins their tierlist again', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    setTierlistPinned.mockImplementation((_id: number, pinned: boolean) =>
      of({ ...tierlistOf('u1'), pinned }),
    );
    await openTierlist();

    await clickPin();
    expect(setTierlistPinned).toHaveBeenLastCalledWith(7, false);
    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pin to profile');

    await clickPin();
    expect(setTierlistPinned).toHaveBeenLastCalledWith(7, true);
    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
  });

  it('keeps the saved pin and explains when the change fails', async () => {
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    setTierlistPinned.mockReturnValue(throwError(() => new Error('503')));
    await openTierlist();

    await clickPin();

    expect(textOf(query(harness.fixture, '.pin-btn'))).toBe('Pinned to profile');
    expect(textOf(query(harness.fixture, '.pin-error'))).toBe(
      "Couldn't update the pin, try again.",
    );
  });

  it('goes back to the tierlists for an unknown tierlist', async () => {
    fetchTierlistById.mockReturnValue(of(undefined));
    await openTierlist();

    expect(TestBed.inject(Router).url).toBe('/tierlists');
  });

  it('counts every restaurant of the tierlist, as its card does', async () => {
    // u1 rated r1 only: r2 (data not created by the app) is left out of the ranking, not of the count
    fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
    await openTierlist();

    expect(textOf(query(harness.fixture, '.meta-chip'))).toBe('2 restaurants');
    expect(queryAll(harness.fixture, '.list-item')).toHaveLength(1);
  });

  it('tells its owner how to add restaurants to an empty tierlist', async () => {
    fetchTierlistById.mockReturnValue(of({ ...tierlistOf('u1'), restaurants: [] }));
    await openTierlist();

    expect(textOf(query(harness.fixture, '.empty-title'))).toBe('No restaurants yet');
    expect(textOf(query(harness.fixture, '.empty-desc'))).toBe(
      'Add the restaurants you rated from their page, or when you review them.',
    );
    expect(queryAll(harness.fixture, '.list-item')).toHaveLength(0);
  });

  it("tells a visitor someone else's tierlist is empty", async () => {
    fetchTierlistById.mockReturnValue(of({ ...tierlistOf('u2'), restaurants: [] }));
    await openTierlist();

    expect(textOf(query(harness.fixture, '.empty-desc'))).toBe(
      'There are no restaurants in this tierlist yet.',
    );
  });

  describe('removing a restaurant', () => {
    /**
     * Opens the owner's tierlist 7, and asks to remove Restaurant r1 from it.
     */
    async function askToRemoveR1(): Promise<void> {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
      await openTierlist();
      await pickAction('Restaurant r1', 'Remove from tierlist');
    }

    /**
     * Clicks the element matching `selector` in the confirmation popup, then waits for the page to update.
     */
    async function clickInPopup(selector: string): Promise<void> {
      query(harness.fixture, `dialog ${selector}`).click();
      await harness.fixture.whenStable();
    }

    it('lets the owner remove a restaurant once they confirm, then shows the tierlist saved', async () => {
      removeRestaurantFromTierlist.mockReturnValue(
        of({ ...tierlistOf('u1'), restaurants: [{ restaurantId: 'r2', addedAt: null }] }),
      );
      await askToRemoveR1();

      expect(query<HTMLDialogElement>(harness.fixture, 'dialog').open).toBe(true);
      expect(textOf(query(harness.fixture, 'dialog .text'))).toBe(
        'Restaurant r1 will be removed from Date night. You can add it again from its page.',
      );
      expect(removeRestaurantFromTierlist).not.toHaveBeenCalled();

      await clickInPopup('.confirm-btn');

      expect(removeRestaurantFromTierlist).toHaveBeenCalledWith(7, 'r1');
      expect(queryAll(harness.fixture, 'dialog')).toHaveLength(0);
      expect(queryAll(harness.fixture, '.list-item')).toHaveLength(0);
      expect(textOf(query(harness.fixture, '.meta-chip'))).toBe('1 restaurant');
    });

    it('keeps the restaurant when the owner cancels', async () => {
      await askToRemoveR1();

      await clickInPopup('.cancel-btn');

      expect(removeRestaurantFromTierlist).not.toHaveBeenCalled();
      expect(queryAll(harness.fixture, 'dialog')).toHaveLength(0);
      expect(queryAll(harness.fixture, '.list-item')).toHaveLength(1);
    });

    it('keeps the popup open and explains when the removal fails', async () => {
      removeRestaurantFromTierlist.mockReturnValue(throwError(() => new Error('503')));
      await askToRemoveR1();

      await clickInPopup('.confirm-btn');

      expect(query<HTMLDialogElement>(harness.fixture, 'dialog').open).toBe(true);
      expect(textOf(query(harness.fixture, 'dialog .error'))).toBe(
        "Couldn't remove the restaurant, try again.",
      );
      expect(queryAll(harness.fixture, '.list-item')).toHaveLength(1);
    });

    it("is not offered on someone else's tierlist", async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      expect(queryAll(harness.fixture, '.list-item')).toHaveLength(2);
      expect(await openActions('Restaurant r1')).not.toContain('Remove from tierlist');
    });
  });

  describe('actions of a restaurant', () => {
    it('offers the owner to see, share or remove each restaurant, from its item, the removal last', async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
      await openTierlist();

      expect(textOf(actionsOf('Restaurant r1').closest('.list-item')!)).toContain('Restaurant r1');
      expect(await openActions('Restaurant r1')).toEqual([
        'See the restaurant',
        'Share',
        'Remove from tierlist',
      ]);
    });

    it("offers a visitor to see or share each restaurant of someone else's tierlist", async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      expect(await openActions('Restaurant r2')).toEqual(['See the restaurant', 'Share']);
      expect(await openActions('Restaurant r1')).toEqual(['See the restaurant', 'Share']);
    });

    it('opens the page of the restaurant', async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      await pickAction('Restaurant r2', 'See the restaurant');

      expect(TestBed.inject(Router).url).toBe('/restaurant/r2');
    });

    it('shares the page of the restaurant through the native share sheet', async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      await pickAction('Restaurant r2', 'Share');

      expect(share).toHaveBeenCalledWith({
        title: 'Restaurant r2',
        text: 'Have a look at Restaurant r2 on FoodRank!',
        url: `${location.origin}/restaurant/r2`,
      });
    });

    it('copies the link of the restaurant page when the browser cannot share, and confirms it', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      delete shareNavigator.share;
      shareNavigator.clipboard = { writeText } as unknown as Clipboard;
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      await pickAction('Restaurant r2', 'Copy link');

      expect(writeText).toHaveBeenCalledWith(`${location.origin}/restaurant/r2`);
      expect(toasts()).toEqual(['success: Link copied! Paste it to your friends.']);
      expect(share).not.toHaveBeenCalled();
    });

    it('tells in a toast when the link cannot be copied', async () => {
      delete shareNavigator.share;
      shareNavigator.clipboard = {
        writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
      } as unknown as Clipboard;
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      await pickAction('Restaurant r2', 'Copy link');

      expect(toasts()).toEqual(["error: Couldn't copy the link."]);
    });

    it('offers no sharing when the browser can neither share nor copy', async () => {
      delete shareNavigator.share;
      fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
      await openTierlist();

      expect(await openActions('Restaurant r1')).toEqual([
        'See the restaurant',
        'Remove from tierlist',
      ]);
    });
  });

  describe('adding restaurants', () => {
    beforeEach(() => {
      // u1 also rated r3, which is not in the tierlist
      fetchUserRatings.mockImplementation((id = 'me') =>
        of(id === 'u1' ? [rating('r3', 70), rating('r1', 40)] : (ratings[id] ?? [])),
      );
    });

    /**
     * The owner's tierlist 7 holding `restaurantIds`, as the API answers a change.
     */
    function tierlistWith(restaurantIds: string[]): Tierlist {
      return {
        ...tierlistOf('u1'),
        restaurants: restaurantIds.map((restaurantId) => ({ restaurantId, addedAt: null })),
      };
    }

    /**
     * Clicks the element of the popup matching `selector`, and waits for the page to update.
     */
    async function clickInAddPopup(selector: string): Promise<void> {
      query(harness.fixture, `dialog ${selector}`).click();
      await harness.fixture.whenStable();
    }

    /**
     * Opens the owner's tierlist 7, then the popup adding restaurants to it.
     */
    async function openAddPopup(): Promise<void> {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u1')));
      await openTierlist();
      query(harness.fixture, '.add-chip').click();
      await harness.fixture.whenStable();
    }

    it('offers the owner, next to the sort chips, a popup listing the restaurants they rated not in the tierlist', async () => {
      await openAddPopup();

      const chip = query(harness.fixture, '.list-toolbar .add-chip');
      expect(queryAll(harness.fixture, '.list-toolbar .choice-chip')).toHaveLength(3);
      expect(textOf(chip)).toBe('Add');
      expect(chip.getAttribute('aria-label')).toBe('Add restaurants to Date night');
      expect(query<HTMLDialogElement>(harness.fixture, 'dialog').open).toBe(true);
      expect(queryAll(harness.fixture, 'dialog .search-row-name').map(textOf)).toEqual([
        'Restaurant r3',
      ]);
    });

    it('shows the restaurant added in the tierlist behind the popup, which stays open', async () => {
      addRestaurantToTierlist.mockReturnValue(
        of({
          ...tierlistOf('u1'),
          restaurants: ['r1', 'r2', 'r3'].map((restaurantId) => ({ restaurantId, addedAt: null })),
        }),
      );
      await openAddPopup();

      query(harness.fixture, 'dialog [aria-label="Add Restaurant r3 to Date night"]').click();
      await harness.fixture.whenStable();

      expect(addRestaurantToTierlist).toHaveBeenCalledWith(7, 'r3');
      expect(textOf(query(harness.fixture, '.meta-chip'))).toBe('3 restaurants');
      expect(listedRestaurants()).toEqual(['Restaurant r3', 'Restaurant r1']);
      expect(
        queryAll(harness.fixture, 'dialog [aria-label="Remove Restaurant r3 from Date night"]'),
      ).toHaveLength(1);
    });

    it('takes the restaurant out of the tierlist behind the popup when its addition is undone', async () => {
      addRestaurantToTierlist.mockReturnValue(of(tierlistWith(['r1', 'r2', 'r3'])));
      removeRestaurantFromTierlist.mockReturnValue(of(tierlistWith(['r1', 'r2'])));
      await openAddPopup();

      await clickInAddPopup('[aria-label="Add Restaurant r3 to Date night"]');
      await clickInAddPopup('[aria-label="Remove Restaurant r3 from Date night"]');

      expect(removeRestaurantFromTierlist).toHaveBeenCalledWith(7, 'r3');
      expect(textOf(query(harness.fixture, '.meta-chip'))).toBe('2 restaurants');
      expect(listedRestaurants()).toEqual(['Restaurant r1']);
      expect(query<HTMLDialogElement>(harness.fixture, 'dialog').open).toBe(true);
    });

    it('offers the restaurants added no more once the popup is opened again', async () => {
      addRestaurantToTierlist.mockReturnValue(of(tierlistWith(['r1', 'r2', 'r3'])));
      await openAddPopup();

      await clickInAddPopup('[aria-label="Add Restaurant r3 to Date night"]');
      await clickInAddPopup('.close-btn');
      query(harness.fixture, '.add-chip').click();
      await harness.fixture.whenStable();

      expect(queryAll(harness.fixture, 'dialog .search-row-name')).toHaveLength(0);
      expect(textOf(query(harness.fixture, 'dialog .search-list-message'))).toBe(
        'Every restaurant you rated is in Date night.',
      );
    });

    it('closes the popup from its × button', async () => {
      await openAddPopup();

      query(harness.fixture, 'dialog .close-btn').click();
      await harness.fixture.whenStable();

      expect(queryAll(harness.fixture, 'dialog')).toHaveLength(0);
    });

    it('is offered on an empty tierlist, with nothing to sort', async () => {
      fetchTierlistById.mockReturnValue(of({ ...tierlistOf('u1'), restaurants: [] }));
      await openTierlist();

      expect(queryAll(harness.fixture, '.list-toolbar .add-chip')).toHaveLength(1);
      expect(queryAll(harness.fixture, '.choice-chip')).toHaveLength(0);
    });

    it("is not offered on someone else's tierlist", async () => {
      fetchTierlistById.mockReturnValue(of(tierlistOf('u2')));
      await openTierlist();

      expect(queryAll(harness.fixture, '.add-chip')).toHaveLength(0);
    });
  });

  it('explains when the tierlist cannot be loaded, instead of loading forever', async () => {
    fetchTierlistById.mockReturnValue(throwError(() => new Error('503')));
    await openTierlist();

    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
    const error = query(harness.fixture, '.load-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(textOf(error)).toBe("Couldn't load the tierlist, try again.");
    expect(TestBed.inject(Router).url).toBe('/tierlists/7');
  });
});
