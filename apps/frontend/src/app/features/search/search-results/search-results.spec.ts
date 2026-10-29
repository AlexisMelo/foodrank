import { Location, ViewportScroller } from '@angular/common';
import { Component, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, filter, firstValueFrom, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserApi } from '@/core/api/user-api';
import { LocationStore } from '@/core/location/location-store';
import type { UserLocation } from '@/core/models/location.model';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { PlaceSuggestion, RestaurantFromPlace } from '@/core/models/restaurant.model';
import type { SearchPage } from '@/core/models/search.model';
import type { UserSummary } from '@/core/models/user.model';
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
 * Builds the user `id` with the username `username` and the display name `displayName`, as the user search lists them.
 */
function user(id: string, username: string, displayName: string | null = null): UserSummary {
  return { id, username, displayName, avatarUrl: null };
}

/**
 * Answer of the user search asked for `limit` users, when it finds `total` users: "User 1", "User 2"... and whether
 * there are more.
 */
function userPage(limit: number, total = 30): SearchPage<UserSummary> {
  const count = Math.min(limit, total);
  return {
    results: Array.from({ length: count }, (_, i) =>
      user(`u${i + 1}`, `user${i + 1}`, `User ${i + 1}`),
    ),
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
  let scrollToPosition: ReturnType<typeof vi.fn>;
  let location: WritableSignal<UserLocation | null>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    location = signal(null);
    searchPlaces = vi.fn((query: string, _: UserLocation | null, limit: number) =>
      of(page(query, limit)),
    );
    searchUsers = vi.fn(() =>
      of({ results: [user('u2', 'camille', 'Camille'), user('u3', 'camilou')], hasMore: false }),
    );
    createRestaurantFromPlace = vi.fn(() => of(stored(true)));
    requestLocation = vi.fn();
    scrollToPosition = vi.fn();
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
          useValue: { searchPlaces, createRestaurantFromPlace },
        },
        { provide: UserApi, useValue: { searchUsers } },
        {
          provide: LocationStore,
          // The status and the city are read by the search area hint
          useValue: {
            location,
            status: signal('idle'),
            city: signal('Lyon'),
            requestLocation,
          },
        },
        { provide: ViewportScroller, useValue: { scrollToPosition } },
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
   * Goes back in the history like the browser's Back button, then waits for the page to load.
   */
  async function goBack(): Promise<void> {
    const router = TestBed.inject(Router);
    // Done by the initial navigation of the app, which tests do not run
    router.setUpLocationChangeListener();
    const navigated = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    // The browser goes back later, as the Navigation API does
    TestBed.inject(Location).back();
    await navigated;
    await harness.fixture.whenStable();
  }

  /**
   * Names of the restaurants shown, in order.
   */
  function restaurantNames(): string[] {
    return queryAll(harness.fixture, '.restaurant-item .item-name').map(textOf);
  }

  /**
   * Names of the profiles shown, in order.
   */
  function profileNames(): string[] {
    return queryAll(harness.fixture, '.profile-item .item-name').map(textOf);
  }

  /**
   * Text of the element matching `selector`, or null when there is none.
   */
  function textOrNull(selector: string): string | null {
    const element = (harness.fixture.nativeElement as HTMLElement).querySelector(selector);
    return element ? textOf(element) : null;
  }

  /**
   * The "Show more" (or "Loading…", "Try again") button of the restaurants or the profiles, or null when there is none.
   */
  function moreButton(
    section: 'restaurants' | 'profiles' = 'restaurants',
  ): HTMLButtonElement | null {
    return (harness.fixture.nativeElement as HTMLElement).querySelector(
      `section[aria-labelledby="${section}-title"] .load-more`,
    );
  }

  /**
   * The "See all" link of the restaurants or the profiles, or null when there is none.
   */
  function seeAll(section: 'restaurants' | 'profiles'): HTMLAnchorElement | null {
    return (harness.fixture.nativeElement as HTMLElement).querySelector(
      `section[aria-labelledby="${section}-title"] .see-all-chip`,
    );
  }

  /**
   * Clicks the "Show more" (or "Try again") button of the restaurants or the profiles, then waits for the page to load.
   */
  async function clickMore(section: 'restaurants' | 'profiles'): Promise<void> {
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
   * Limit sent with the last profile search.
   */
  function lastProfileLimit(): number {
    return searchUsers.mock.lastCall?.[1] as number;
  }

  /**
   * The filter chips, in display order; none when they are not shown.
   */
  function filterChips(): HTMLButtonElement[] {
    return queryAll<HTMLButtonElement>(harness.fixture, '.search-header .choice-chip');
  }

  /**
   * Text of the pressed filter chip.
   */
  function pressedFilter(): string | undefined {
    const pressed = filterChips().find((chip) => chip.getAttribute('aria-pressed') === 'true');
    return pressed ? textOf(pressed) : undefined;
  }

  /**
   * Titles of the sections shown, in order.
   */
  function sectionTitles(): string[] {
    return queryAll(harness.fixture, '.section-title').map(textOf);
  }

  /**
   * Url of the page now open.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  it('shows the query in the searchbar, the first 5 restaurants and the profiles found', async () => {
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
    expect(profileNames()).toEqual(['Camille', 'camilou']);
    // The username under the display name, the username alone otherwise; the API gives no number of restaurants
    // rated in the search
    expect(queryAll(harness.fixture, '.profile-item .item-meta').map(textOf)).toEqual(['@camille']);
  });

  it('shows no "Show more" on the All tab, but "See all" next to each title, even when every result is shown', async () => {
    await open('/search?q=pizza');

    expect(moreButton('restaurants')).toBeNull();
    expect(moreButton('profiles')).toBeNull();
    expect(textOf(seeAll('restaurants')!)).toBe('See all');
    expect(seeAll('restaurants')!.getAttribute('aria-label')).toBe('See all restaurants');
    expect(seeAll('restaurants')!.getAttribute('href')).toBe('/search?q=pizza&type=restaurants');
    // The 2 profiles found are all of them
    expect(profileNames()).toEqual(['Camille', 'camilou']);
    expect(seeAll('profiles')!.getAttribute('aria-label')).toBe('See all profiles');
    expect(seeAll('profiles')!.getAttribute('href')).toBe('/search?q=pizza&type=profiles');
  });

  it('opens the tab of the restaurants with "See all", from the top of the page, Back returning to the All tab', async () => {
    await open('/search?q=pizza');

    seeAll('restaurants')!.click();
    await harness.fixture.whenStable();

    expect(url()).toBe('/search?q=pizza&type=restaurants');
    expect(pressedFilter()).toBe('Restaurants');
    expect(sectionTitles()).toEqual(['Restaurants']);
    expect(searchPlaces).toHaveBeenLastCalledWith('pizza', null, 10);
    expect(restaurantNames()).toHaveLength(10);
    expect(seeAll('restaurants')).toBeNull();
    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(scrollToPosition).toHaveBeenCalledExactlyOnceWith([0, 0]);

    await goBack();

    expect(url()).toBe('/search?q=pizza');
    expect(pressedFilter()).toBe('All');
  });

  it('opens the tab of the profiles with "See all", from the top of the page', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit)));
    await open('/search?q=user');
    expect(profileNames()).toHaveLength(5);

    seeAll('profiles')!.click();
    await harness.fixture.whenStable();

    expect(url()).toBe('/search?q=user&type=profiles');
    expect(pressedFilter()).toBe('Profiles');
    expect(sectionTitles()).toEqual(['Profiles']);
    expect(searchUsers).toHaveBeenLastCalledWith('user', 10);
    expect(profileNames()).toHaveLength(10);
    expect(seeAll('profiles')).toBeNull();
    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(scrollToPosition).toHaveBeenCalledExactlyOnceWith([0, 0]);
  });

  it('shows the OpenStreetMap attribution in the restaurants title row, on the All tab and theirs', async () => {
    await open('/search?q=pizza');
    expect(textOrNull('#restaurants-title + .see-all-chip + .attribution')).toBe(
      '© OpenStreetMap contributors',
    );

    await open('/search?q=pizza&type=restaurants');

    expect(textOrNull('#restaurants-title + .attribution')).toBe('© OpenStreetMap contributors');
  });

  it('opens a profile found', async () => {
    await open('/search?q=camil');
    const camille = query(harness.fixture, '.profile-item');
    expect(camille.getAttribute('href')).toBe('/user/u2');

    camille.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/user/u2');
  });

  it('shows the first 10 restaurants of their tab, then 10 more on each "Show more", keeping the ones shown while they load', async () => {
    const more = new Subject<SearchPage<PlaceSuggestion>>();
    searchPlaces.mockReturnValueOnce(of(page('pizza', 10))).mockReturnValueOnce(more);
    await open('/search?q=pizza&type=restaurants');
    expect(restaurantNames()).toHaveLength(10);

    moreButton()!.click();
    // Renders while more restaurants load (whenStable would wait for them)
    TestBed.tick();

    expect(lastLimit()).toBe(20);
    expect(restaurantNames()).toHaveLength(10);
    expect(queryAll(harness.fixture, '.skeleton')).toHaveLength(0);
    expect(textOf(moreButton()!)).toBe('Loading…');
    expect(moreButton()!.disabled).toBe(true);

    more.next(page('pizza', 20));
    more.complete();
    await harness.fixture.whenStable();

    expect(restaurantNames()).toHaveLength(20);
    expect(restaurantNames()[19]).toBe('Place pizza-20');
    expect(textOf(moreButton()!)).toBe('Show more');
  });

  it('hides "Show more" once every restaurant is shown', async () => {
    searchPlaces.mockImplementation((q: string, _: UserLocation | null, limit: number) =>
      of(page(q, limit, 12)),
    );
    await open('/search?q=pizza&type=restaurants');

    await clickButton(harness.fixture, 'Show more');

    expect(restaurantNames()).toHaveLength(12);
    expect(moreButton()).toBeNull();
  });

  it('never asks for more restaurants than the API returns at most', async () => {
    searchPlaces.mockImplementation((q: string, _: UserLocation | null, limit: number) =>
      of(page(q, limit, 100)),
    );
    await open('/search?q=pizza&type=restaurants');

    const limits: number[] = [];
    for (let i = 0; i < 5; i++) {
      await clickButton(harness.fixture, 'Show more');
      limits.push(lastLimit());
    }

    expect(limits).toEqual([20, 30, 40, 50, 50]);
  });

  it('starts again from the first 10 restaurants of their tab when the query changes', async () => {
    await open('/search?q=pizza&type=restaurants');
    await clickMore('restaurants');
    expect(lastLimit()).toBe(20);

    await open('/search?q=sushi&type=restaurants');

    expect(searchPlaces).toHaveBeenLastCalledWith('sushi', null, 10);
    expect(restaurantNames()).toHaveLength(10);
    expect(restaurantNames()[0]).toBe('Place sushi-1');
  });

  it('starts again from the first 10 profiles of their tab when the query changes', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit)));
    await open('/search?q=user&type=profiles');
    await clickMore('profiles');
    expect(lastProfileLimit()).toBe(20);

    await open('/search?q=camil&type=profiles');

    expect(searchUsers).toHaveBeenLastCalledWith('camil', 10);
    expect(profileNames()).toHaveLength(10);
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
    // The profiles do not depend on the place search
    expect(profileNames()).toEqual(['Camille', 'camilou']);

    await clickButton(harness.fixture, 'Try again');

    expect(textOrNull('.restaurants-hint')).toBeNull();
    expect(restaurantNames()).toHaveLength(5);
  });

  it('keeps the restaurants shown when loading more fails, and lets the user try again', async () => {
    searchPlaces
      .mockReturnValueOnce(of(page('pizza', 10)))
      .mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=pizza&type=restaurants');

    await clickButton(harness.fixture, 'Show more');
    expect(restaurantNames()).toHaveLength(10);
    expect(textOrNull('.restaurants-hint')).toBe('Search is unavailable right now');

    await clickButton(harness.fixture, 'Try again');
    expect(lastLimit()).toBe(20);
    expect(restaurantNames()).toHaveLength(20);
    expect(textOrNull('.restaurants-hint')).toBeNull();
  });

  it('tells when no restaurant and no profile is found', async () => {
    searchPlaces.mockReturnValue(of({ results: [], hasMore: false }));
    searchUsers.mockReturnValue(of({ results: [], hasMore: false }));
    await open('/search?q=zzzz');

    expect(textOrNull('.restaurants-hint')).toBe('No restaurants found');
    expect(textOrNull('.profiles-hint')).toBe('No profiles found');
    expect(moreButton('restaurants')).toBeNull();
    expect(moreButton('profiles')).toBeNull();
    expect(seeAll('restaurants')).toBeNull();
    expect(seeAll('profiles')).toBeNull();
    expect(textOrNull('.attribution')).toBeNull();
  });

  it('shows the first 10 profiles of their tab, then 10 more on each "Show more", keeping the ones shown while they load', async () => {
    const more = new Subject<SearchPage<UserSummary>>();
    searchUsers.mockReturnValueOnce(of(userPage(10))).mockReturnValueOnce(more);
    await open('/search?q=user&type=profiles');
    expect(profileNames()).toHaveLength(10);
    expect(profileNames()[0]).toBe('User 1');

    moreButton('profiles')!.click();
    // Renders while more profiles load (whenStable would wait for them)
    TestBed.tick();

    expect(lastProfileLimit()).toBe(20);
    expect(profileNames()).toHaveLength(10);
    expect(textOf(moreButton('profiles')!)).toBe('Loading…');
    expect(moreButton('profiles')!.disabled).toBe(true);

    more.next(userPage(20));
    more.complete();
    await harness.fixture.whenStable();

    expect(profileNames()).toHaveLength(20);
    expect(profileNames()[19]).toBe('User 20');
    expect(textOf(moreButton('profiles')!)).toBe('Show more');
  });

  it('hides the profiles "Show more" once every profile is shown', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit, 12)));
    await open('/search?q=user&type=profiles');

    await clickMore('profiles');

    expect(profileNames()).toHaveLength(12);
    expect(moreButton('profiles')).toBeNull();
  });

  it('never asks for more profiles than the API returns at most', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit, 100)));
    await open('/search?q=user&type=profiles');

    const limits: number[] = [];
    for (let i = 0; i < 5; i++) {
      await clickMore('profiles');
      limits.push(lastProfileLimit());
    }

    expect(limits).toEqual([20, 30, 40, 50, 50]);
  });

  it('tells when the profile search fails, still showing the restaurants, and lets the user try again', async () => {
    searchUsers.mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=pizza');

    expect(textOrNull('.profiles-hint')).toBe("Profiles can't be searched right now");
    expect(profileNames()).toEqual([]);
    expect(restaurantNames()).toHaveLength(5);

    await clickMore('profiles');

    expect(textOrNull('.profiles-hint')).toBeNull();
    expect(profileNames()).toEqual(['Camille', 'camilou']);
  });

  it('keeps the profiles shown when loading more fails, and lets the user try again', async () => {
    searchUsers
      .mockImplementation((_: string, limit: number) => of(userPage(limit)))
      .mockReturnValueOnce(of(userPage(10)))
      .mockReturnValueOnce(throwError(() => new Error('503')));
    await open('/search?q=user&type=profiles');

    await clickMore('profiles');
    expect(profileNames()).toHaveLength(10);
    expect(textOrNull('.profiles-hint')).toBe("Profiles can't be searched right now");

    await clickMore('profiles');
    expect(lastProfileLimit()).toBe(20);
    expect(profileNames()).toHaveLength(20);
    expect(textOrNull('.profiles-hint')).toBeNull();
  });

  it('does not search a query shorter than 3 characters', async () => {
    await open('/search?q=pi');

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
    expect(textOrNull('.hint')).toBe('Type at least 3 characters to search');
    expect(queryAll(harness.fixture, 'section')).toHaveLength(0);
    expect(filterChips()).toHaveLength(0);
  });

  it('only shows the searchbar without a query', async () => {
    await open('/search');

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(textOrNull('.hint')).toBeNull();
    expect(queryAll(harness.fixture, 'section')).toHaveLength(0);
    expect(filterChips()).toHaveLength(0);
    expect(query<HTMLInputElement>(harness.fixture, '.search-input').value).toBe('');
  });

  it('offers to show all the results, only the restaurants or only the profiles, all by default', async () => {
    await open('/search?q=pizza');

    expect(filterChips().map(textOf)).toEqual(['All', 'Restaurants', 'Profiles']);
    expect(pressedFilter()).toBe('All');
    expect(query(harness.fixture, 'app-choice-chips').getAttribute('aria-label')).toBe('Show');
    expect(sectionTitles()).toEqual(['Restaurants', 'Profiles']);
  });

  it('shows only the first 10 profiles, without searching the restaurants again, Back leaving the search', async () => {
    searchUsers.mockImplementation((_: string, limit: number) => of(userPage(limit)));
    await open('/search?q=user');

    await clickButton(harness.fixture, 'Profiles');

    expect(url()).toBe('/search?q=user&type=profiles');
    expect(pressedFilter()).toBe('Profiles');
    expect(sectionTitles()).toEqual(['Profiles']);
    expect(restaurantNames()).toEqual([]);
    expect(searchUsers).toHaveBeenLastCalledWith('user', 10);
    expect(profileNames()).toHaveLength(10);
    expect(searchPlaces).toHaveBeenCalledTimes(1);

    // The chip replaced the url: Back goes to the page before the search
    await goBack();

    expect(url()).toBe('/');
  });

  it('shows only the restaurants of a link filtered on them, without searching the profiles', async () => {
    await open('/search?q=pizza&type=restaurants');

    expect(pressedFilter()).toBe('Restaurants');
    expect(sectionTitles()).toEqual(['Restaurants']);
    expect(searchPlaces).toHaveBeenCalledExactlyOnceWith('pizza', null, 10);
    expect(restaurantNames()).toHaveLength(10);
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it('shows all the results again, 5 of each type', async () => {
    await open('/search?q=pizza&type=profiles');

    await clickButton(harness.fixture, 'All');

    expect(url()).toBe('/search?q=pizza');
    expect(pressedFilter()).toBe('All');
    expect(sectionTitles()).toEqual(['Restaurants', 'Profiles']);
    expect(searchPlaces).toHaveBeenCalledExactlyOnceWith('pizza', null, 5);
    expect(restaurantNames()).toHaveLength(5);
    expect(searchUsers).toHaveBeenLastCalledWith('pizza', 5);
  });

  it('shows the first 5 restaurants already loaded at once on the All tab, while searching them again', async () => {
    await open('/search?q=pizza&type=restaurants');
    await clickMore('restaurants');
    expect(restaurantNames()).toHaveLength(20);
    searchPlaces.mockReturnValueOnce(new Subject<SearchPage<PlaceSuggestion>>());

    await harness.navigateByUrl('/search?q=pizza');
    // Renders while the restaurants load again (whenStable would wait for them)
    TestBed.tick();

    expect(searchPlaces).toHaveBeenLastCalledWith('pizza', null, 5);
    expect(restaurantNames()).toEqual([
      'Place pizza-1',
      'Place pizza-2',
      'Place pizza-3',
      'Place pizza-4',
      'Place pizza-5',
    ]);
    expect(moreButton()).toBeNull();
  });

  it('shows all the results for an unknown filter', async () => {
    await open('/search?q=pizza&type=tierlists');

    expect(pressedFilter()).toBe('All');
    expect(sectionTitles()).toEqual(['Restaurants', 'Profiles']);
  });

  it('keeps the filter when a new query is typed in the searchbar', async () => {
    await open('/search?q=pizza&type=profiles');

    await typeIn(harness.fixture, '.search-input', 'sushi');
    await submitForm(harness.fixture);
    await harness.fixture.whenStable();

    expect(url()).toBe('/search?q=sushi&type=profiles');
    expect(pressedFilter()).toBe('Profiles');
    expect(searchUsers).toHaveBeenLastCalledWith('sushi', 10);
    expect(searchPlaces).not.toHaveBeenCalled();
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
