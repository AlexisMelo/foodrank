import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { type LocationStatus, LocationStore } from '@/core/location/location-store';
import type { UserLocation } from '@/core/models/location.model';
import type { RestaurantSuggestion } from '@/core/models/restaurant.model';
import type { UserSummary } from '@/core/models/user.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { Explore } from './explore';

/**
 * Empty page standing for the restaurant page, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the suggestion of the restaurant `id`, at `distanceKm` from the user (null: position not sent), rated
 * `globalScore` on average (null: nobody rated it) and rated by `followedRaters`.
 */
function suggestion(
  id: string,
  distanceKm: number | null,
  globalScore: number | null = null,
  followedRaters: UserSummary[] = [],
): RestaurantSuggestion {
  return {
    restaurant: {
      id,
      name: `Restaurant ${id}`,
      emoji: '🍕',
      address: `${id} street, Caen`,
      description: '',
      lat: 49.18,
      lng: -0.37,
    },
    distanceKm,
    globalScore,
    followedRaters,
  };
}

/**
 * Builds the user `username`, followed by the logged-in user, with a display name and no profile picture.
 */
function user(username: string, displayName: string | null = null): UserSummary {
  return { id: `id-${username}`, username, displayName, avatarUrl: null };
}

/**
 * Position of the user in the tests: Caen.
 */
const CAEN: UserLocation = { lat: 49.18, lon: -0.37 };

describe('Explore', () => {
  let location: WritableSignal<UserLocation | null>;
  let status: WritableSignal<LocationStatus>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let city: WritableSignal<string | null>;
  let cityIsDefault: WritableSignal<boolean>;
  let fetchSuggestions: ReturnType<typeof vi.fn>;
  let fetchRecommendations: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    location = signal(null);
    status = signal('pending');
    requestLocation = vi.fn();
    // The default city of the API, until the user is located
    city = signal('Paris');
    cityIsDefault = signal(true);
    // Like the API: nearest first with distances from the user's position, from the default city without distances
    // otherwise
    fetchSuggestions = vi.fn((position: UserLocation | null) =>
      of(
        position
          ? [
              suggestion('near', 0.556),
              suggestion('mid', 2.224),
              suggestion('rouen', 103.5),
              suggestion('paris', 201.7),
              suggestion('lyon', 541.2),
            ]
          : [
              suggestion('paris', null),
              suggestion('mid', null),
              suggestion('lyon', null),
              suggestion('near', null),
              suggestion('rouen', null),
            ],
      ),
    );
    // Nothing recommended unless a test says otherwise
    fetchRecommendations = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'explore', component: Explore },
          { path: '**', component: StubPage },
        ]),
        { provide: RestaurantApi, useValue: { fetchSuggestions, fetchRecommendations } },
        {
          provide: LocationStore,
          useValue: { location, status, requestLocation, city, cityIsDefault },
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Opens the explore page and waits for it to load.
   */
  async function openExplore(): Promise<void> {
    harness = await RouterTestingHarness.create('/explore');
    await harness.fixture.whenStable();
  }

  /**
   * Names of the restaurants suggested near the user, in order.
   */
  function names(): string[] {
    return queryAll(harness.fixture, '.near-you .restaurant-name').map(textOf);
  }

  /**
   * Placeholder cards shown while the restaurants near the user load.
   */
  function skeletons(): HTMLElement[] {
    return queryAll(harness.fixture, '.near-you .card-skeleton');
  }

  it('asks the API for the suggestions near the user once the location is allowed', async () => {
    await openExplore();
    expect(requestLocation).toHaveBeenCalledTimes(1);
    // Waits for the location before asking anything, with a placeholder for each restaurant suggested
    expect(skeletons()).toHaveLength(5);
    expect(fetchSuggestions).not.toHaveBeenCalled();
    expect(names()).toEqual([]);

    location.set(CAEN);
    status.set('granted');
    await harness.fixture.whenStable();

    expect(skeletons()).toHaveLength(0);
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions).toHaveBeenCalledWith(CAEN, 5);
    expect(names()).toEqual([
      'Restaurant near',
      'Restaurant mid',
      'Restaurant rouen',
      'Restaurant paris',
      'Restaurant lyon',
    ]);
    expect(queryAll(harness.fixture, '.card-distance').slice(0, 2).map(textOf)).toEqual([
      '📍 556 m',
      '📍 2.2 km',
    ]);
    // The address between the name and the distance
    const card = query(harness.fixture, '.suggestion-card');
    expect(
      Array.from(card.querySelectorAll('.restaurant-name, .card-address, .card-distance'), textOf),
    ).toEqual(['Restaurant near', 'near street, Caen', '📍 556 m']);
    expect(queryAll(harness.fixture, '.location-notice')).toHaveLength(0);
  });

  it('asks without position when the location is not answered within 3 seconds', async () => {
    // Only the timer of the wait (rxjs uses setInterval): Angular keeps scheduling its rendering with setTimeout
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await openExplore();

    await vi.advanceTimersByTimeAsync(2999);
    await harness.fixture.whenStable();
    expect(skeletons()).toHaveLength(5);
    expect(fetchSuggestions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await harness.fixture.whenStable();
    expect(skeletons()).toHaveLength(0);
    expect(fetchSuggestions).toHaveBeenCalledWith(null, 5);
    expect(names()).toEqual([
      'Restaurant paris',
      'Restaurant mid',
      'Restaurant lyon',
      'Restaurant near',
      'Restaurant rouen',
    ]);
    expect(textOf(query(harness.fixture, '.location-notice'))).toBe(
      '📍 Enable location to sort by distance',
    );

    // Allowed later: asked again, sorted by distance
    location.set(CAEN);
    status.set('granted');
    await harness.fixture.whenStable();
    expect(fetchSuggestions).toHaveBeenLastCalledWith(CAEN, 5);
    expect(names()[0]).toBe('Restaurant near');
    expect(queryAll(harness.fixture, '.location-notice')).toHaveLength(0);
  });

  it('asks without position, and shows the address without distance and a notice, when the location is denied', async () => {
    status.set('dismissed');
    await openExplore();

    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions).toHaveBeenCalledWith(null, 5);
    expect(names()).toEqual([
      'Restaurant paris',
      'Restaurant mid',
      'Restaurant lyon',
      'Restaurant near',
      'Restaurant rouen',
    ]);
    const address = query(harness.fixture, '.card-address');
    expect(textOf(address)).toBe('paris street, Caen');
    // Cut after 2 lines: whole on hover
    expect(address.title).toBe('paris street, Caen');
    expect(queryAll(harness.fixture, '.card-distance')).toHaveLength(0);
    expect(textOf(query(harness.fixture, '.location-notice'))).toBe(
      '📍 Enable location to sort by distance',
    );
  });

  it('shows no address line for a restaurant without address, the distance still shown', async () => {
    const near = suggestion('near', 0.556);
    fetchSuggestions.mockReturnValue(
      of([{ ...near, restaurant: { ...near.restaurant, address: '' } }]),
    );
    status.set('blocked');
    await openExplore();

    expect(names()).toEqual(['Restaurant near']);
    expect(queryAll(harness.fixture, '.card-address')).toHaveLength(0);
    expect(textOf(query(harness.fixture, '.card-distance'))).toBe('📍 556 m');
  });

  it('links each card to its restaurant page', async () => {
    status.set('blocked');
    await openExplore();
    const card = query(harness.fixture, '.suggestion-card');
    expect(card.getAttribute('href')).toBe('/restaurant/paris');

    card.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/paris');
  });

  it('explains when the suggestions cannot be loaded, instead of loading forever', async () => {
    fetchSuggestions.mockReturnValue(throwError(() => new Error('API down')));
    status.set('unavailable');
    await openExplore();

    expect(skeletons()).toHaveLength(0);
    expect(names()).toEqual([]);
    expect(textOf(query(harness.fixture, '.near-you .empty'))).toBe(
      "Couldn't load the restaurants",
    );
  });

  it('explains when there is no restaurant left to try', async () => {
    fetchSuggestions.mockReturnValue(of([]));
    status.set('blocked');
    await openExplore();

    expect(names()).toEqual([]);
    expect(textOf(query(harness.fixture, '.near-you .empty'))).toContain(
      'No restaurant left to try',
    );
  });

  it('shows the suggestions in a section titled "Near you", then the recommendations', async () => {
    status.set('blocked');
    await openExplore();

    expect(queryAll(harness.fixture, '.section-title').map(textOf)).toEqual([
      'Near you',
      'Recommendations',
    ]);
    expect(queryAll(harness.fixture, '.near-you .suggestion-card')).toHaveLength(5);
  });

  describe('city of the results', () => {
    /**
     * Chip of the city at the top right of the page; null when there is none.
     */
    function cityChip(): HTMLElement | null {
      return (harness.fixture.nativeElement as HTMLElement).querySelector(
        '.page-header .city-chip',
      );
    }

    it("shows the user's city at the top right once located", async () => {
      location.set(CAEN);
      status.set('granted');
      city.set('Caen');
      cityIsDefault.set(false);
      await openExplore();

      const chip = cityChip()!;
      expect(textOf(chip.querySelector('.city-name')!)).toBe('📍 Caen');
      expect(chip.classList.contains('city-chip-default')).toBe(false);
      // What it means, for screen readers and on hover
      expect(textOf(chip.querySelector('.visually-hidden')!)).toBe('Your location: Caen');
      expect(chip.title).toBe('Your location: Caen');
    });

    it('shows the default city of the API, dimmed and said so, while the location is unknown', async () => {
      status.set('blocked');
      await openExplore();

      const chip = cityChip()!;
      expect(textOf(chip.querySelector('.city-name')!)).toBe('📍 Paris');
      expect(chip.classList.contains('city-chip-default')).toBe(true);
      expect(chip.title).toBe('Location unknown: restaurants around Paris');
    });

    it("follows the city of the store: the default one until the user's is known", async () => {
      await openExplore();
      expect(cityChip()!.title).toBe('Location unknown: restaurants around Paris');

      location.set(CAEN);
      status.set('granted');
      city.set('Caen');
      cityIsDefault.set(false);
      await harness.fixture.whenStable();

      expect(cityChip()!.title).toBe('Your location: Caen');
    });

    it('shows no chip until the city is known', async () => {
      city.set(null);
      status.set('blocked');
      await openExplore();

      expect(cityChip()).toBeNull();
      expect(names()).toHaveLength(5);
    });
  });

  describe('global score', () => {
    it('shows the global score of each restaurant in its bubble, rounded to one decimal', async () => {
      fetchSuggestions.mockReturnValue(
        of([suggestion('near', 0.556, 6.6667), suggestion('mid', 2.224, 9)]),
      );
      status.set('blocked');
      await openExplore();

      const bubbles = queryAll(harness.fixture, '.score-bubble');
      expect(bubbles.map(textOf)).toEqual(['6.7', '9']);
      expect(bubbles[0]!.title).toBe('Global rating: 6.7/10');
      // Colored as every score: yellow when good, green when great
      expect(bubbles.map((b) => b.style.backgroundColor)).toEqual([
        'rgb(249, 199, 79)',
        'rgb(144, 190, 109)',
      ]);
    });

    it('shows a "?" in a neutral bubble on a restaurant nobody rated, and no score of the criteria', async () => {
      fetchSuggestions.mockReturnValue(
        of([suggestion('near', 0.556), suggestion('mid', 2.224, 9)]),
      );
      status.set('blocked');
      await openExplore();

      const [unrated, rated] = queryAll(harness.fixture, '.score-bubble');
      expect(textOf(unrated!)).toBe('?');
      expect(unrated!.title).toBe('Not rated yet');
      // No score color: the neutral background of its class
      expect(unrated!.classList.contains('score-bubble-unrated')).toBe(true);
      expect(unrated!.style.backgroundColor).toBe('');
      expect(rated!.classList.contains('score-bubble-unrated')).toBe(false);
      expect(queryAll(harness.fixture, 'app-rating-scores')).toHaveLength(0);
    });
  });

  describe('followed raters', () => {
    /**
     * Chip of the users followed who rated the first restaurant; null when there is none.
     */
    function ratersChip(): HTMLElement | null {
      return (harness.fixture.nativeElement as HTMLElement).querySelector('.raters-chip');
    }

    it('shows the avatars of the users followed who ate there, without their names', async () => {
      fetchSuggestions.mockReturnValue(
        of([suggestion('near', 0.556, 8, [user('camille', 'Camille'), user('hugo')])]),
      );
      status.set('blocked');
      await openExplore();

      const chip = ratersChip()!;
      expect(queryAll(harness.fixture, '.raters-chip .rater-avatar').map(textOf)).toEqual([
        'C',
        'H',
      ]);
      expect(textOf(chip)).not.toContain('Camille');
      // The names, for screen readers and on hover: the display name, or the username when there is none
      expect(chip.getAttribute('role')).toBe('img');
      expect(chip.getAttribute('aria-label')).toBe('Camille and hugo ate here');
      expect(chip.title).toBe('Camille and hugo ate here');
      // Part of the card, which opens the restaurant
      expect(chip.closest('a')?.getAttribute('href')).toBe('/restaurant/near');
    });

    it('shows the first 3 avatars, then the number of the other users followed who ate there', async () => {
      fetchSuggestions.mockReturnValue(
        of([
          suggestion('near', 0.556, 8, [
            user('ana'),
            user('ben'),
            user('cleo'),
            user('dan'),
            user('eve'),
          ]),
        ]),
      );
      status.set('blocked');
      await openExplore();

      expect(queryAll(harness.fixture, '.rater-avatar').map(textOf)).toEqual(['A', 'B', 'C']);
      expect(textOf(query(harness.fixture, '.raters-more'))).toBe('+2');
      expect(ratersChip()!.getAttribute('aria-label')).toBe(
        'ana, ben, cleo, dan, and eve ate here',
      );
    });

    it('shows no chip when nobody followed ate there', async () => {
      fetchSuggestions.mockReturnValue(of([suggestion('near', 0.556, 8)]));
      status.set('blocked');
      await openExplore();

      expect(ratersChip()).toBeNull();
      expect(queryAll(harness.fixture, '.raters-more')).toHaveLength(0);
    });
  });

  it('keeps the placeholders while the suggestions load once the location is known, then shows the restaurants', async () => {
    const answer = new Subject<RestaurantSuggestion[]>();
    fetchSuggestions.mockReturnValue(answer);
    location.set(CAEN);
    status.set('granted');
    // Rendered without waiting: the suggestions are not answered, so the page would never be stable
    harness = await RouterTestingHarness.create('/explore');

    expect(fetchSuggestions).toHaveBeenCalledWith(CAEN, 5);
    // Told to screen readers as loading, under the title of the section
    expect(query(harness.fixture, '.near-you .suggestions-row').getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(textOf(query(harness.fixture, '.near-you .section-title'))).toBe('Near you');
    expect(skeletons()).toHaveLength(5);
    expect(names()).toEqual([]);

    answer.next([suggestion('near', 0.556)]);
    await harness.fixture.whenStable();

    expect(query(harness.fixture, '.near-you .suggestions-row').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(skeletons()).toHaveLength(0);
    expect(names()).toEqual(['Restaurant near']);
  });

  describe('recommendations', () => {
    /**
     * Names of the restaurants recommended, in order.
     */
    function recommended(): string[] {
      return queryAll(harness.fixture, '.recommendations .restaurant-name').map(textOf);
    }

    it('asks the API for the recommendations once the location is allowed, and shows them in their section', async () => {
      fetchRecommendations.mockReturnValue(
        of([
          suggestion('pick', 1.2, 8, [user('camille', 'Camille')]),
          suggestion('other', 4.5, 6, [user('hugo')]),
        ]),
      );
      await openExplore();
      // Waits for the location, as the restaurants near the user
      expect(queryAll(harness.fixture, '.recommendations .card-skeleton')).toHaveLength(5);
      expect(fetchRecommendations).not.toHaveBeenCalled();

      location.set(CAEN);
      status.set('granted');
      await harness.fixture.whenStable();

      expect(fetchRecommendations).toHaveBeenCalledTimes(1);
      expect(fetchRecommendations).toHaveBeenCalledWith(CAEN, 5);
      expect(textOf(query(harness.fixture, '.recommendations .section-title'))).toBe(
        'Recommendations',
      );
      expect(recommended()).toEqual(['Restaurant pick', 'Restaurant other']);
      // The same cards as near the user: distance, global score, and the users followed who recommend it
      const card = query(harness.fixture, '.recommendations .suggestion-card');
      expect(card.getAttribute('href')).toBe('/restaurant/pick');
      expect(textOf(card.querySelector('.card-distance')!)).toBe('📍 1.2 km');
      expect(textOf(card.querySelector('.score-bubble')!)).toBe('8');
      expect(card.querySelector('.raters-chip')!.getAttribute('aria-label')).toBe(
        'Camille ate here',
      );
      // The restaurants near the user are not mixed with them
      expect(names()).not.toContain('Restaurant pick');
    });

    it('asks without position when the location is denied: the API measures the range from its default city', async () => {
      fetchRecommendations.mockReturnValue(of([suggestion('pick', null, 8)]));
      status.set('dismissed');
      await openExplore();

      expect(fetchRecommendations).toHaveBeenCalledWith(null, 5);
      expect(recommended()).toEqual(['Restaurant pick']);
      expect(queryAll(harness.fixture, '.recommendations .card-distance')).toHaveLength(0);
    });

    it('asks to follow more people in the area when nothing is recommended', async () => {
      status.set('blocked');
      await openExplore();

      expect(recommended()).toEqual([]);
      expect(textOf(query(harness.fixture, '.recommendations .empty'))).toBe(
        'Follow more people in your area to enable recommendations',
      );
    });

    it('explains when the recommendations cannot be loaded, the restaurants near the user still shown', async () => {
      fetchRecommendations.mockReturnValue(throwError(() => new Error('API down')));
      status.set('blocked');
      await openExplore();

      expect(textOf(query(harness.fixture, '.recommendations .empty'))).toBe(
        "Couldn't load the recommendations",
      );
      expect(names()).toHaveLength(5);
    });

    it('keeps the placeholders while the recommendations load, then shows them', async () => {
      const answer = new Subject<RestaurantSuggestion[]>();
      fetchRecommendations.mockReturnValue(answer);
      status.set('blocked');
      // Rendered without waiting: the recommendations are not answered, so the page would never be stable
      harness = await RouterTestingHarness.create('/explore');

      const row = query(harness.fixture, '.recommendations .suggestions-row');
      expect(row.getAttribute('aria-busy')).toBe('true');
      expect(queryAll(harness.fixture, '.recommendations .card-skeleton')).toHaveLength(5);
      // The restaurants near the user do not wait for them
      expect(names()).toHaveLength(5);

      answer.next([suggestion('pick', null, 8)]);
      await harness.fixture.whenStable();

      expect(row.getAttribute('aria-busy')).toBe('false');
      expect(queryAll(harness.fixture, '.recommendations .card-skeleton')).toHaveLength(0);
      expect(recommended()).toEqual(['Restaurant pick']);
    });
  });
});
