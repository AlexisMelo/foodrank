import { Component, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { PlaceSuggestion, RestaurantFromPlace } from '@/core/models/restaurant.model';
import { clickButton, query, queryAll, textOf } from '@/testing/dom-testing';
import { SearchResults } from './search-results';

/**
 * Empty page standing for the restaurant page, which these tests do not need.
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
 * Answer of POST /api/restaurants/from-place: the restaurant r9, `created` by this request or not.
 */
function stored(created: boolean): RestaurantFromPlace {
  return {
    restaurant: {
      id: 'r9',
      name: 'Pizza Roma',
      cuisine: '',
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
  let autocompletePlaces: ReturnType<typeof vi.fn>;
  let searchPlaces: ReturnType<typeof vi.fn>;
  let createRestaurantFromPlace: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let location: WritableSignal<UserPosition | null>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    location = signal(null);
    autocompletePlaces = vi.fn((query: string) => of([place(`${query}-1`), place(`${query}-2`)]));
    searchPlaces = vi.fn();
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
          useValue: { autocompletePlaces, searchPlaces, createRestaurantFromPlace },
        },
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
   * Names of the results shown, in order.
   */
  function names(): string[] {
    return queryAll(harness.fixture, '.item-name').map(textOf);
  }

  /**
   * Text of the hint under the results, or null when there is none.
   */
  function hint(): string | null {
    const element = (harness.fixture.nativeElement as HTMLElement).querySelector('.hint');
    return element ? textOf(element) : null;
  }

  it('loads the suggestions of the query, and reloads them when the query changes', async () => {
    await open('/search?q=%20pizza%20');

    expect(requestLocation).toHaveBeenCalledTimes(1);
    expect(textOf(query(harness.fixture, '.query'))).toBe('"pizza"');
    expect(autocompletePlaces).toHaveBeenCalledWith('pizza', null);
    expect(names()).toEqual(['Place pizza-1', 'Place pizza-2']);

    await open('/search?q=sushi');

    expect(autocompletePlaces).toHaveBeenLastCalledWith('sushi', null);
    expect(names()).toEqual(['Place sushi-1', 'Place sushi-2']);
  });

  it('ignores the late answer of a previous query', async () => {
    const pizza = new Subject<PlaceSuggestion[]>();
    autocompletePlaces.mockReturnValueOnce(pizza);
    await harness.navigateByUrl('/search?q=pizza');
    expect(pizza.observed).toBe(true);
    // The query changes before the pizza suggestions answer
    await open('/search?q=sushi');

    pizza.next([place('late')]);
    await harness.fixture.whenStable();

    expect(names()).toEqual(['Place sushi-1', 'Place sushi-2']);
  });

  it('does not search a query shorter than 3 characters', async () => {
    await open('/search?q=pi');

    expect(autocompletePlaces).not.toHaveBeenCalled();
    expect(hint()).toBe('No restaurants found');
    expect(queryAll(harness.fixture, '.load-more')).toHaveLength(0);
  });

  it('searches near the user once located', async () => {
    searchPlaces.mockReturnValue(of([]));
    location.set({ lat: 49.18, lon: -0.37 });
    await open('/search?q=pizza');

    await clickButton(harness.fixture, 'Load more');

    expect(autocompletePlaces).toHaveBeenCalledWith('pizza', { lat: 49.18, lon: -0.37 });
    expect(searchPlaces).toHaveBeenCalledWith('pizza', { lat: 49.18, lon: -0.37 });
  });

  it('tells when the search fails, instead of finding nothing', async () => {
    autocompletePlaces.mockReturnValue(throwError(() => new Error('503')));
    await open('/search?q=pizza');

    expect(names()).toEqual([]);
    expect(hint()).toBe('Search is unavailable right now');
  });

  it('loads more results, without the ones already shown', async () => {
    searchPlaces.mockReturnValue(of([place('pizza-2'), place('pizza-3')]));
    await open('/search?q=pizza');

    await clickButton(harness.fixture, 'Load more');

    expect(searchPlaces).toHaveBeenCalledWith('pizza', null);
    expect(names()).toEqual(['Place pizza-1', 'Place pizza-2', 'Place pizza-3']);
    expect(queryAll(harness.fixture, '.load-more')).toHaveLength(0);
  });

  it('starts again from the suggestions when the query changes after loading more', async () => {
    searchPlaces.mockReturnValue(of([place('pizza-3')]));
    await open('/search?q=pizza');
    await clickButton(harness.fixture, 'Load more');

    await open('/search?q=sushi');

    expect(names()).toEqual(['Place sushi-1', 'Place sushi-2']);
    expect(textOf(query(harness.fixture, '.load-more'))).toBe('Load more');
  });

  it('tells when loading more fails, and lets the user try again', async () => {
    searchPlaces.mockReturnValueOnce(throwError(() => new Error('503')));
    searchPlaces.mockReturnValueOnce(of([place('pizza-3')]));
    await open('/search?q=pizza');

    await clickButton(harness.fixture, 'Load more');
    expect(hint()).toBe('Search is unavailable right now');
    expect(names()).toEqual(['Place pizza-1', 'Place pizza-2']);

    await clickButton(harness.fixture, 'Load more');
    expect(hint()).toBeNull();
    expect(names()).toEqual(['Place pizza-1', 'Place pizza-2', 'Place pizza-3']);
  });

  it('stores the restaurant of a place opened first, then opens its page with "The explorer"', async () => {
    autocompletePlaces.mockReturnValue(of([place('N42')]));
    await open('/search?q=pizza');

    query(harness.fixture, '.list-item').click();
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
    autocompletePlaces.mockReturnValue(of([place('N42')]));
    await open('/search?q=pizza');

    query(harness.fixture, '.list-item').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
    expect(TestBed.inject(CelebrationStore).pending()).toBeNull();
  });

  it('stays on the results and explains when the place cannot be opened', async () => {
    createRestaurantFromPlace.mockReturnValue(throwError(() => new Error('503')));
    autocompletePlaces.mockReturnValue(of([place('N42')]));
    await open('/search?q=pizza');

    query(harness.fixture, '.list-item').click();
    await harness.fixture.whenStable();

    expect(textOf(query(harness.fixture, '.open-error'))).toBe(
      "Couldn't open this restaurant, try again.",
    );
    expect(TestBed.inject(Router).url).toBe('/search?q=pizza');
  });
});
