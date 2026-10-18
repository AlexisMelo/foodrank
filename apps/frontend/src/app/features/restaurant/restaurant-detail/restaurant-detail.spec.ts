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
import { clickButton, query, textOf } from '@/testing/dom-testing';

/**
 * Builds the restaurant `id` of the database.
 */
function restaurant(id: string): Restaurant {
  return {
    id,
    name: `Restaurant ${id}`,
    cuisine: 'Italian',
    score: 0,
    emoji: '🍕',
    address: '1 rue de la Paix',
    description: '',
    tags: [],
    lat: 0,
    lng: 0,
  };
}

describe('RestaurantDetail', () => {
  let fetchRestaurantById: ReturnType<typeof vi.fn>;
  let createRestaurantFromPlace: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fetchRestaurantById = vi.fn((id: string) => of(restaurant(id)));
    createRestaurantFromPlace = vi.fn(() => of(restaurant('r9')));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        { provide: AuthStore, useValue: { isLoggedIn: signal(true), currentUserId: 'me' } },
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById,
            createRestaurantFromPlace,
            fetchRestaurants: () => of([]),
          },
        },
        {
          provide: RatingApi,
          useValue: {
            fetchRecentRatings: () => of([]),
            fetchMyRatings: () => of([]),
            fetchRatingSummary: () =>
              of({ count: 0, food: null, service: null, setting: null, global: null }),
            // Read by the home page
            fetchUserRatings: () => of([]),
            fetchCommunityVisitsByUserId: () => of([]),
          },
        },
        // Read by the home page
        { provide: UserApi, useValue: { fetchUserProfile: () => of(undefined) } },
        { provide: TierlistApi, useValue: { fetchTierlistsByUserId: () => of([]) } },
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
    expect(textOf(query(harness.fixture, '.chip-cuisine'))).toBe('Italian');
    expect(textOf(query(harness.fixture, '.info-text'))).toBe('1 rue de la Paix');
  });

  it('gets or creates the restaurant of a place, then replaces the URL with its own', async () => {
    await open('/restaurant/place/N123');

    expect(createRestaurantFromPlace).toHaveBeenCalledWith('N123');
    expect(url()).toBe('/restaurant/r9');
    expect(textOf(query(harness.fixture, '.name'))).toBe('Restaurant r9');
  });

  it('leaves for the home page when the restaurant does not exist', async () => {
    fetchRestaurantById.mockReturnValue(of(undefined));

    await open('/restaurant/unknown');

    expect(url()).toBe('/');
  });

  it('explains when the restaurant cannot be loaded, and goes back', async () => {
    createRestaurantFromPlace.mockReturnValue(throwError(() => new Error('503')));
    await open('/restaurant/r1');

    await open('/restaurant/place/N123');
    expect(textOf(query(harness.fixture, '.load-error p'))).toBe("Couldn't load this restaurant");

    // Going back in the history is asynchronous: wait for the router to follow it
    const navigated = firstValueFrom(
      TestBed.inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)),
    );
    await clickButton(harness.fixture, 'Go back');
    await navigated;
    expect(url()).toBe('/restaurant/r1');
  });
});
