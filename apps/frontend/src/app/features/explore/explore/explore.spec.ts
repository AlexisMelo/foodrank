import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { type LocationStatus, LocationStore } from '@/core/location/location-store';
import type { UserLocation } from '@/core/models/location.model';
import type { RestaurantSuggestion } from '@/core/models/restaurant.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { Explore } from './explore';

/**
 * Empty page standing for the restaurant page, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the suggestion of the restaurant `id`, at `distanceKm` from the user (null: position not sent).
 */
function suggestion(id: string, distanceKm: number | null): RestaurantSuggestion {
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
  };
}

/**
 * Position of the user in the tests: Caen.
 */
const CAEN: UserLocation = { lat: 49.18, lon: -0.37 };

describe('Explore', () => {
  let location: WritableSignal<UserLocation | null>;
  let status: WritableSignal<LocationStatus>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let fetchSuggestions: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    location = signal(null);
    status = signal('pending');
    requestLocation = vi.fn();
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
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'explore', component: Explore },
          { path: '**', component: StubPage },
        ]),
        { provide: RestaurantApi, useValue: { fetchSuggestions } },
        { provide: LocationStore, useValue: { location, status, requestLocation } },
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
   * Names of the restaurants suggested, in order.
   */
  function names(): string[] {
    return queryAll(harness.fixture, '.card-name').map(textOf);
  }

  it('asks the API for the suggestions near the user once the location is allowed', async () => {
    await openExplore();
    expect(requestLocation).toHaveBeenCalledTimes(1);
    // Waits for the location before asking anything
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(1);
    expect(fetchSuggestions).not.toHaveBeenCalled();
    expect(names()).toEqual([]);

    location.set(CAEN);
    status.set('granted');
    await harness.fixture.whenStable();

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
    expect(queryAll(harness.fixture, '.location-notice')).toHaveLength(0);
  });

  it('asks without position when the location is not answered within 3 seconds', async () => {
    // Only the timer of the wait (rxjs uses setInterval): Angular keeps scheduling its rendering with setTimeout
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await openExplore();

    await vi.advanceTimersByTimeAsync(2999);
    await harness.fixture.whenStable();
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(1);
    expect(fetchSuggestions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await harness.fixture.whenStable();
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
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

  it('asks without position, and shows the address and a notice, when the location is denied', async () => {
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
    expect(textOf(query(harness.fixture, '.card-address'))).toBe('paris street, Caen');
    expect(textOf(query(harness.fixture, '.location-notice'))).toBe(
      '📍 Enable location to sort by distance',
    );
  });

  it('shows no line under the name of a restaurant without address, when the location is denied', async () => {
    const paris = suggestion('paris', null);
    fetchSuggestions.mockReturnValue(
      of([{ ...paris, restaurant: { ...paris.restaurant, address: '' } }]),
    );
    status.set('dismissed');
    await openExplore();

    expect(names()).toEqual(['Restaurant paris']);
    expect(queryAll(harness.fixture, '.card-distance')).toHaveLength(0);
  });

  it('links each card to its restaurant page', async () => {
    status.set('blocked');
    await openExplore();
    const card = query(harness.fixture, '.restaurant-card');
    expect(card.getAttribute('href')).toBe('/restaurant/paris');

    card.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/paris');
  });

  it('shows no suggestion when the API fails', async () => {
    fetchSuggestions.mockReturnValue(throwError(() => new Error('API down')));
    status.set('unavailable');
    await openExplore();

    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
    expect(names()).toEqual([]);
  });
});
