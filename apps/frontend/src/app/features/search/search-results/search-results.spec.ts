import { Component, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserApi } from '@/core/api/user-api';
import { UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { PlaceSuggestion, RestaurantFromPlace } from '@/core/models/restaurant.model';
import type { SearchPage } from '@/core/models/search.model';
import type { UserProfile } from '@/core/models/user.model';
import { clickButton, query, queryAll, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { SearchResults } from './search-results';

/**
 * Empty page standing for the restaurant and profile pages, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the result of the place `placeId`.
 */
function place(placeId: string): PlaceSuggestion {
  return { placeId, name: `Place ${placeId}`, secondaryText: 'Caen' };
}

/**
 * Answer of the place search of `query` asked for `limit` results, when it finds `total` places: "Place pizza-1",
 * "Place pizza-2"... and whether there are more.
 */
function page(query: string, limit: number, total = 30): SearchPage<PlaceSuggestion> {
  const count = Math.min(limit, total);
  return {
    results: Array.from({ length: count }, (_, i) => place(`${query}-${i + 1}`)),
    hasMore: total > limit,
  };
}

/**
 * Builds the profile of the user `id` named `name`, who rated `count` restaurants.
 */
function user(id: string, name: string, count: number): UserProfile {
  return { id, name, avatarUrl: null, ratedRestaurantsCount: count };
}

/**
 * Answer of the user search asked for `limit` users, when it finds `total` users: "User 1", "User 2"... and whether
 * there are more.
 */
function userPage(limit: number, total = 30): SearchPage<UserProfile> {
  const count = Math.min(limit, total);
  return {
    results: Array.from({ length: count }, (_, i) => user(`u${i + 1}`, `User ${i + 1}`, 0)),
    hasMore: total > limit,
  };
}

/**
 * Answer of POST /api/restaurants/from-place: the restaurant r9, `created` by this request or not.
 */
function stored(created: boolean): RestaurantFromPlace {
  return {
    restaurant: {
      id: 'r9',
      name: 'Pizza Roma',
      emoji: '🍽️',
      address: '',
      description: '',
      lat: 49.18,
      lng: -0.37,
    },
    created,
  };
}

describe('SearchResults', () => {
  let searchPlaces: ReturnType<typeof vi.fn>;
  let searchUsers: ReturnType<typeof vi.fn>;
  let createRestaurantFromPlace: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let location: WritableSignal<UserPosition | null>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    location = signal(null);
    searchPlaces = vi.fn((query: string, _: UserPosition | null, limit: number) =>
      of(page(query, limit)),
    );
    searchUsers = vi.fn(() =>
      of({ results: [user('u2', 'Camille', 2), user('u3', 'Camilou', 1)], hasMore: false }),
    );
    createRestaurantFromPlace = vi.fn(() => of(stored(true)));
    requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'search', component: SearchResults },
            { path: '**', component: StubPage },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: RestaurantApi,
          useValue: {
            searchPlaces,
            createRestaurantFromPlace,
            fetchSearchArea: () => of({ locality: 'Lyon', isDefault: true }),
          },
        },
        { provide: UserApi, useValue: { searchUsers } },
        {
          provide: UserLocation,
          useValue: { location, status: signal('idle'), requestLocation },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /**
   * Opens `url` and waits for it to load; the page is reused when it is already open.
   */
  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  }

  /**
   * Names of the restaurants shown, in order.
   */
  function restaurantNames(): string[] {
    return queryAll(harness.fixture, '.restaurant-item .item-name').map(textOf);
  }

  /**
   * Names of the users shown, in order.
   */
  function userNames(): string[] {
    return queryAll(harness.fixture, '.user-item .item-name').map(textOf);
  }

  /**
   * Text of the element matching `selector`, or null when there is none.
   */
  function textOrNull(selector: string): string | null {
    const element = (harness.fixture.nativeElement as HTMLElement).querySelector(selector);
    return element ? textOf(element) : null;
  }

  /**
   * The "Show more" (or "Loading…", "Try again") button of the restaurants or the users, or null when there is none.
   */
  function moreButton(section: 'restaurants' | 'users' = 'restaurants'): HTMLButtonElement | null {
    return (harness.fixture.nativeElement as HTMLElement).querySelector(
      `section[aria-labelledby="${section}-title"] .load-more`,
    );
  }

  /**
   * Clicks the "Show more" (or "Try again") button of the restaurants or the users, then waits for the page to load.
   */
  async function clickMore(section: 'restaurants' | 'users'): Promise<void> {
    moreButton(section)!.click();
    await harness.fixture.whenStable();
  }

  /**
   * Limit sent with the last place search.
   */
  function lastLimit(): number {
    return searchPlaces.mock.lastCall?.[2] as number;
  }

  /**
   * Limit sent with the last user search.
   */
  function lastUserLimit(): number {
    return searchUsers.mock.lastCall?.[1] as number;
  }

  it('shows the query in the searchbar, the first 5 restaurants and the users found', async () => {
    await open('/search?q=%20pizza%20');

    expect(requestLocation).toHaveBeenCalledTimes(1);
    expect(query<HTMLInputElement>(harness.fixture, '.search-input').value).toBe('pizza');
    expect(searchPlaces).toHaveBeenCalledExactlyOnceWith('pizza', null, 5);
    expect(restaurantNames()).toEqual([
      'Place pizza-1',
      'Place pizza-2',
      'Place pizza-3',
      'Place pizza-4',
      'Place pizza-5',
    ]);
    expect(searchUsers).toHaveBeenCalledExactlyOnceWith('pizza', 5);
    expect(userNames()).toEqual(['Camille', 'Camilou']);
    expect(queryAll(harness.fixture, '.user-item .item-meta').map(textOf)).toEqual([
      '2 restaurants',
      '1 restaurant',
    ]);
  });

  it('opens the profile of a user found', async () => {
    await open('/search?q=camil');
    const camille = query(harness.fixture, '.user-item');
    expect(camille.getAttribute('href')).toBe('/user/u2');

    camille.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/user/u2');
  });

  it('shows 10 more restaurants on each "Show more", keeping the ones shown while they load', async () => {
    const more = new Subject<SearchPage<PlaceSuggestion>>();
    searchPlaces.mockReturnValueOnce(of(page('pizza', 5))).mockReturnValueOnce(more);
    await open('/search?q=pizza');

    moreButton()!.click();
    // Renders while more restaurants load (whenStable would wait for them)
    TestBed.tick();

    expect(lastLimit()).toBe(15);
    expect(restaurantNames()).toHaveLength(5);
    expect(queryAll(harness.fixture, '.skeleton')).toHaveLength(0);
    expect(textOf(moreButton()!)).toBe('Loading…');
    expect(moreButton()!.disabled).toBe(true);

    more.next(page('pizza', 15));
    more.complete();
    await harness.fixture.whenStable();

    expect(restaurantNames()).toHaveLength(15);
    expect(restaurantNames()[14]).toBe('Place pizza-15');
    expect(textOf(moreButton()!)).toBe('Show more');
  });

  it('hides "Show more" once every restaurant is shown', async () => {
    searchPlaces.mockImplementation((q: string, _: UserPosition | null, limit: number) =>
      of(page(q, limit, 12)),
    );
    await open('/search?q=pizza');

    await clickButton(harness.fixture, 'Show more');

    expect(restaurantNames()).toHaveLength(12);
    expect(moreButton()).toBeNull();
  });

  it('never asks for more restaurants than the API returns at most', async () => {
    searchPlaces.mockImplementation((q: string, _: UserPosition | null, limit: number) =>
      of(page(q, limit, 100)),
    );
    await open('/search?q=pizza');

    const limits: number[] = [];
    for (let i = 0; i < 5; i++) {
      await clickButton(harness.fixture, 'Show more');
      limits.push(lastLimit());
    }

    expect(limits).toEqual([15, 25, 35, 45, 50]);
  });

  it('starts again from 5 restaurants and 5 users when the query changes', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit)));
    await open('/search?q=pizza');
    await clickMore('restaurants');
    await clickMore('users');
    expect(lastUserLimit()).toBe(15);

    await open('/search?q=sushi');

    expect(searchPlaces).toHaveBeenLastCalledWith('sushi', null, 5);
    expect(restaurantNames()).toHaveLength(5);
    expect(restaurantNames()[0]).toBe('Place sushi-1');
    expect(searchUsers).toHaveBeenLastCalledWith('sushi', 5);
    expect(userNames()).toHaveLength(5);
  });

  it('ignores the late answer of a previous query', async () => {
    const pizza = new Subject<SearchPage<PlaceSuggestion>>();
    searchPlaces.mockReturnValueOnce(pizza);
    await harness.navigateByUrl('/search?q=pizza');
    expect(pizza.observed).toBe(true);
    // The query changes before the pizza restaurants answer
    await open('/search?q=sushi');

    pizza.next({ results: [place('late')], hasMore: false });
    await harness.fixture.whenStable();

    expect(restaurantNames()[0]).toBe('Place sushi-1');
  });

  it('searches the restaurants again near the user once located', async () => {
    await open('/search?q=pizza');

    location.set({ lat: 49.18, lon: -0.37 });
    await harness.fixture.whenStable();

    expect(searchPlaces).toHaveBeenLastCalledWith('pizza', { lat: 49.18, lon: -0.37 }, 5);
    expect(searchUsers).toHaveBeenCalledTimes(1);
  });

  it('tells when the restaurant search fails, and lets the user try again', async () => {
    searchPlaces.mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=pizza');

    expect(restaurantNames()).toEqual([]);
    expect(textOrNull('.restaurants-hint')).toBe('Search is unavailable right now');
    // The users do not depend on the place search
    expect(userNames()).toEqual(['Camille', 'Camilou']);

    await clickButton(harness.fixture, 'Try again');

    expect(textOrNull('.restaurants-hint')).toBeNull();
    expect(restaurantNames()).toHaveLength(5);
  });

  it('keeps the restaurants shown when loading more fails, and lets the user try again', async () => {
    searchPlaces
      .mockReturnValueOnce(of(page('pizza', 5)))
      .mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=pizza');

    await clickButton(harness.fixture, 'Show more');
    expect(restaurantNames()).toHaveLength(5);
    expect(textOrNull('.restaurants-hint')).toBe('Search is unavailable right now');

    await clickButton(harness.fixture, 'Try again');
    expect(lastLimit()).toBe(15);
    expect(restaurantNames()).toHaveLength(15);
    expect(textOrNull('.restaurants-hint')).toBeNull();
  });

  it('tells when no restaurant and no user is found', async () => {
    searchPlaces.mockReturnValue(of({ results: [], hasMore: false }));
    searchUsers.mockReturnValue(of({ results: [], hasMore: false }));
    await open('/search?q=zzzz');

    expect(textOrNull('.restaurants-hint')).toBe('No restaurants found');
    expect(textOrNull('.users-hint')).toBe('No users found');
    expect(moreButton('restaurants')).toBeNull();
    expect(moreButton('users')).toBeNull();
    expect(textOrNull('.attribution')).toBeNull();
  });

  it('shows the first 5 users, then 10 more on each "Show more", keeping the ones shown while they load', async () => {
    const more = new Subject<SearchPage<UserProfile>>();
    searchUsers.mockReturnValueOnce(of(userPage(5))).mockReturnValueOnce(more);
    await open('/search?q=user');
    expect(userNames()).toEqual(['User 1', 'User 2', 'User 3', 'User 4', 'User 5']);

    moreButton('users')!.click();
    // Renders while more users load (whenStable would wait for them)
    TestBed.tick();

    expect(lastUserLimit()).toBe(15);
    expect(userNames()).toHaveLength(5);
    expect(textOf(moreButton('users')!)).toBe('Loading…');
    expect(moreButton('users')!.disabled).toBe(true);

    more.next(userPage(15));
    more.complete();
    await harness.fixture.whenStable();

    expect(userNames()).toHaveLength(15);
    expect(userNames()[14]).toBe('User 15');
    expect(textOf(moreButton('users')!)).toBe('Show more');
    // The restaurants do not depend on the user search
    expect(searchPlaces).toHaveBeenCalledTimes(1);
  });

  it('hides the users "Show more" once every user is shown', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit, 12)));
    await open('/search?q=user');

    await clickMore('users');

    expect(userNames()).toHaveLength(12);
    expect(moreButton('users')).toBeNull();
  });

  it('never asks for more users than the API returns at most', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit, 100)));
    await open('/search?q=user');

    const limits: number[] = [];
    for (let i = 0; i < 5; i++) {
      await clickMore('users');
      limits.push(lastUserLimit());
    }

    expect(limits).toEqual([15, 25, 35, 45, 50]);
  });

  it('tells when the user search fails, still showing the restaurants, and lets the user try again', async () => {
    searchUsers.mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=pizza');

    expect(textOrNull('.users-hint')).toBe("Users can't be searched right now");
    expect(userNames()).toEqual([]);
    expect(restaurantNames()).toHaveLength(5);

    await clickMore('users');

    expect(textOrNull('.users-hint')).toBeNull();
    expect(userNames()).toEqual(['Camille', 'Camilou']);
  });

  it('keeps the users shown when loading more fails, and lets the user try again', async () => {
    searchUsers
      .mockImplementation((_: string, limit: number) => of(userPage(limit)))
      .mockReturnValueOnce(of(userPage(5)))
      .mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=user');

    await clickMore('users');
    expect(userNames()).toHaveLength(5);
    expect(textOrNull('.users-hint')).toBe("Users can't be searched right now");

    await clickMore('users');
    expect(lastUserLimit()).toBe(15);
    expect(userNames()).toHaveLength(15);
    expect(textOrNull('.users-hint')).toBeNull();
  });

  it('does not search a query shorter than 3 characters', async () => {
    await open('/search?q=pi');

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
    expect(textOrNull('.hint')).toBe('Type at least 3 characters to search');
    expect(queryAll(harness.fixture, 'section')).toHaveLength(0);
  });

  it('only shows the searchbar without a query', async () => {
    await open('/search');

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(textOrNull('.hint')).toBeNull();
    expect(queryAll(harness.fixture, 'section')).toHaveLength(0);
    expect(query<HTMLInputElement>(harness.fixture, '.search-input').value).toBe('');
  });

  it('opens the results of a new query typed in the searchbar', async () => {
    await open('/search?q=pizza');

    await typeIn(harness.fixture, '.search-input', ' sushi bar ');
    await submitForm(harness.fixture);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/search?q=sushi%20bar');
    expect(searchPlaces).toHaveBeenLastCalledWith('sushi bar', null, 5);
    expect(searchUsers).toHaveBeenLastCalledWith('sushi bar', 5);
  });

  it('stores the restaurant of a place opened first, then opens its page with "The explorer"', async () => {
    searchPlaces.mockReturnValue(of({ results: [place('N42')], hasMore: false }));
    await open('/search?q=pizza');

    query(harness.fixture, '.restaurant-item').click();
    await harness.fixture.whenStable();

    expect(createRestaurantFromPlace.mock.calls).toEqual([['N42']]);
    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
    expect(TestBed.inject(CelebrationStore).pending()).toEqual({
      restaurantId: 'r9',
      kind: 'explorer',
    });
  });

  it('opens the restaurant page of a place already stored, without "The explorer"', async () => {
    createRestaurantFromPlace.mockReturnValue(of(stored(false)));
    searchPlaces.mockReturnValue(of({ results: [place('N42')], hasMore: false }));
    await open('/search?q=pizza');

    query(harness.fixture, '.restaurant-item').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
    expect(TestBed.inject(CelebrationStore).pending()).toBeNull();
  });

  it('stays on the results and explains when the place cannot be opened', async () => {
    createRestaurantFromPlace.mockReturnValue(throwError(() => new Error('503')));
    searchPlaces.mockReturnValue(of({ results: [place('N42')], hasMore: false }));
    await open('/search?q=pizza');

    query(harness.fixture, '.restaurant-item').click();
    await harness.fixture.whenStable();

    expect(textOf(query(harness.fixture, '.open-error'))).toBe(
      "Couldn't open this restaurant, try again.",
    );
    expect(TestBed.inject(Router).url).toBe('/search?q=pizza');
  });
});
