import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { AuthStore } from '@/core/auth/auth-store';
import { type LocationStatus, UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import type { Restaurant } from '@/core/models/restaurant.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { Explore } from './explore';

/**
 * Empty page standing for the restaurant page, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the restaurant `id` at (`lat`, `lng`).
 */
function restaurant(id: string, lat: number, lng: number): Restaurant {
  return {
    id,
    name: `Restaurant ${id}`,
    cuisine: `Cuisine ${id}`,
    emoji: '🍕',
    address: '',
    description: '',
    lat,
    lng,
  } as Restaurant;
}

describe('Explore', () => {
  let location: WritableSignal<UserPosition | null>;
  let status: WritableSignal<LocationStatus>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    location = signal(null);
    status = signal('pending');
    requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'explore', component: Explore },
          { path: '**', component: StubPage },
        ]),
        { provide: AuthStore, useValue: { isLoggedIn: signal(true), currentUserId: 'alex' } },
        {
          provide: RestaurantApi,
          useValue: {
            // In the API order: far ones first; the user is in Caen (49.18, -0.37)
            fetchRestaurants: () =>
              of([
                restaurant('paris', 48.85, 2.35),
                restaurant('visited', 49.18, -0.37),
                restaurant('mid', 49.2, -0.37),
                restaurant('lyon', 45.76, 4.83),
                restaurant('near', 49.185, -0.37),
                restaurant('rouen', 49.44, 1.1),
                restaurant('nice', 43.7, 7.27),
              ]),
          },
        },
        {
          provide: RatingApi,
          useValue: {
            fetchCommunityVisitsByUserId: () => of([{ id: 'v1', restaurantId: 'visited' }]),
          },
        },
        { provide: UserLocation, useValue: { location, status, requestLocation } },
      ],
    });
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

  it('sorts the restaurants not visited yet by distance once the location is allowed', async () => {
    await openExplore();
    expect(requestLocation).toHaveBeenCalledTimes(1);
    // Waits for the location before showing anything
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(1);
    expect(names()).toEqual([]);

    location.set({ lat: 49.18, lon: -0.37 });
    status.set('granted');
    await harness.fixture.whenStable();

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

  it('keeps the API order, with the cuisine and a notice, when the location is denied', async () => {
    status.set('dismissed');
    await openExplore();

    expect(names()).toEqual([
      'Restaurant paris',
      'Restaurant mid',
      'Restaurant lyon',
      'Restaurant near',
      'Restaurant rouen',
    ]);
    expect(textOf(query(harness.fixture, '.card-distance.muted'))).toBe('Cuisine paris');
    expect(textOf(query(harness.fixture, '.location-notice'))).toBe(
      '📍 Enable location to sort by distance',
    );
  });

  it('opens the restaurant picked', async () => {
    status.set('blocked');
    await openExplore();

    query(harness.fixture, '.restaurant-card').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/paris');
  });
});
