import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSuggestion } from '@/core/models/restaurant.model';
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

describe('SearchResults', () => {
  let autocompletePlaces: ReturnType<typeof vi.fn>;
  let searchPlaces: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    autocompletePlaces = vi.fn((query: string) => of([place(`${query}-1`), place(`${query}-2`)]));
    searchPlaces = vi.fn();
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
        { provide: RestaurantApi, useValue: { autocompletePlaces, searchPlaces } },
        {
          provide: UserLocation,
          useValue: { location: signal(null), status: signal('idle'), requestLocation },
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

  it('opens the restaurant page of the place picked', async () => {
    autocompletePlaces.mockReturnValue(of([place('node/42')]));
    await open('/search?q=pizza');

    query(harness.fixture, '.list-item').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/place/node%2F42');
  });
});
