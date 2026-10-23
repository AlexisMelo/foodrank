import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { PlaceSuggestion, RestaurantFromPlace } from '@/core/models/restaurant.model';
import { query, queryAll, stubDialogs, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { NewReviewStore } from '@/core/review/new-review-store';
import { NewReviewSheet } from './new-review-sheet';

/**
 * Empty page standing for the restaurant and search results pages, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * Builds the suggestion of the place `placeId` named `name`.
 */
function place(placeId: string, name: string): PlaceSuggestion {
  return { placeId, name, secondaryText: `${name} street, Caen` };
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
      lat: null,
      lng: null,
    },
    created,
  };
}

describe('NewReviewSheet', () => {
  let autocompletePlaces: ReturnType<typeof vi.fn>;
  let createRestaurantFromPlace: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<NewReviewSheet>;
  let store: NewReviewStore;

  beforeEach(async () => {
    stubDialogs();
    // Only the timers of the debounce (rxjs uses setInterval): Angular keeps scheduling its rendering with setTimeout
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    autocompletePlaces = vi.fn(() => of([place('N1', 'Pizza Roma'), place('N2', 'Pizza Napoli')]));
    createRestaurantFromPlace = vi.fn(() => of(stored(true)));
    requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPage }]),
        {
          provide: RestaurantApi,
          useValue: {
            autocompletePlaces,
            createRestaurantFromPlace,
            fetchSearchArea: () => of({ locality: 'Lyon', isDefault: true }),
          },
        },
        {
          provide: UserLocation,
          useValue: { location: signal(null), status: signal('idle'), requestLocation },
        },
      ],
    });
    store = TestBed.inject(NewReviewStore);
    fixture = TestBed.createComponent(NewReviewSheet);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Opens the sheet, as the tab bar or a "+ New" chip does.
   */
  async function open(): Promise<void> {
    store.open();
    await fixture.whenStable();
  }

  /**
   * Lets `ms` milliseconds pass, then waits for the sheet to update.
   */
  async function wait(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
    await fixture.whenStable();
  }

  /**
   * Names of the suggestions shown.
   */
  function suggestionNames(): string[] {
    return queryAll(fixture, '.suggestion-name').map(textOf);
  }

  /**
   * Text of the hint under the search field, or null when there is none.
   */
  function hint(): string | null {
    const element = (fixture.nativeElement as HTMLElement).querySelector('.hint');
    return element ? textOf(element) : null;
  }

  it('opens as a modal dialog, asking for the location', async () => {
    await open();

    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });

  it('searches once the user stops typing, with the last query', async () => {
    await open();

    await typeIn(fixture, '.search-input', 'piz');
    await wait(300);
    await typeIn(fixture, '.search-input', 'pizza ');
    await wait(499);
    expect(autocompletePlaces).not.toHaveBeenCalled();

    await wait(1);
    expect(autocompletePlaces).toHaveBeenCalledExactlyOnceWith('pizza', null);
    expect(suggestionNames()).toEqual(['Pizza Roma', 'Pizza Napoli']);
  });

  it('does not search a query shorter than 3 characters, and clears the suggestions right away', async () => {
    await open();
    await typeIn(fixture, '.search-input', 'pizza');
    await wait(500);
    expect(suggestionNames()).toHaveLength(2);

    await typeIn(fixture, '.search-input', 'pi');
    expect(suggestionNames()).toEqual([]);
    expect(hint()).toBeNull();

    await wait(500);
    expect(autocompletePlaces).toHaveBeenCalledTimes(1);
  });

  it('tells when nothing is found, and when the search fails', async () => {
    autocompletePlaces.mockReturnValue(of([]));
    await open();
    await typeIn(fixture, '.search-input', 'zzzz');
    await wait(500);
    expect(hint()).toBe('No restaurants found');

    autocompletePlaces.mockReturnValue(throwError(() => new Error('503')));
    await typeIn(fixture, '.search-input', 'pizza');
    await wait(500);
    expect(hint()).toBe('Search is unavailable right now');
  });

  it('only says nothing was found once the query as typed has been searched', async () => {
    autocompletePlaces.mockReturnValue(of([]));
    await open();

    await typeIn(fixture, '.search-input', 'zzzz');
    // Debounce running: not searched yet
    expect(hint()).toBeNull();
    await wait(500);
    expect(hint()).toBe('No restaurants found');

    // A new query, not searched yet: the previous answer does not apply to it
    await typeIn(fixture, '.search-input', 'zzzzz');
    expect(hint()).toBeNull();
    await wait(500);
    expect(hint()).toBe('No restaurants found');
  });

  /**
   * Opens the sheet and shows the suggestion of the place N42.
   */
  async function showSuggestion(): Promise<void> {
    autocompletePlaces.mockReturnValue(of([place('N42', 'Pizza Roma')]));
    await open();
    await typeIn(fixture, '.search-input', 'pizza');
    await wait(500);
  }

  it('stores the restaurant of a place opened first, then opens its page with "The explorer", and closes', async () => {
    await showSuggestion();

    query(fixture, '.suggestion-item').click();
    await fixture.whenStable();

    expect(createRestaurantFromPlace.mock.calls).toEqual([['N42']]);
    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
    expect(TestBed.inject(CelebrationStore).pending()).toEqual({
      restaurantId: 'r9',
      kind: 'explorer',
    });
    expect(store.isOpen()).toBe(false);
  });

  it('opens the restaurant page of a place already stored, without "The explorer"', async () => {
    createRestaurantFromPlace.mockReturnValue(of(stored(false)));
    await showSuggestion();

    query(fixture, '.suggestion-item').click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
    expect(TestBed.inject(CelebrationStore).pending()).toBeNull();
  });

  it('disables the suggestions while the place opens, so it is not sent twice', async () => {
    const answer = new Subject<RestaurantFromPlace>();
    createRestaurantFromPlace.mockReturnValue(answer);
    await showSuggestion();

    query(fixture, '.suggestion-item').click();
    await fixture.whenStable();

    const item = query<HTMLButtonElement>(fixture, '.suggestion-item');
    expect(item.disabled).toBe(true);
    expect(item.getAttribute('aria-busy')).toBe('true');
    item.click();
    expect(createRestaurantFromPlace).toHaveBeenCalledTimes(1);

    answer.next(stored(false));
    answer.complete();
    // The sheet navigates after an await: let it start before waiting for the app to settle
    await Promise.resolve();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/restaurant/r9');
  });

  it('stays open and explains when the place cannot be opened', async () => {
    createRestaurantFromPlace.mockReturnValue(throwError(() => new Error('503')));
    await showSuggestion();

    query(fixture, '.suggestion-item').click();
    await fixture.whenStable();

    expect(textOf(query(fixture, '.open-error'))).toBe("Couldn't open this restaurant, try again.");
    expect(query<HTMLButtonElement>(fixture, '.suggestion-item').disabled).toBe(false);
    expect(store.isOpen()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('opens the search results on Enter, and closes', async () => {
    await open();
    await typeIn(fixture, '.search-input', '  sushi bar ');

    await submitForm(fixture);

    expect(TestBed.inject(Router).url).toBe('/search?q=sushi%20bar');
    expect(store.isOpen()).toBe(false);
  });

  it('closes on Escape and on a click on the overlay, not on a click inside the sheet', async () => {
    await open();
    query(fixture, '.sheet').click();
    await fixture.whenStable();
    expect(store.isOpen()).toBe(true);

    query(fixture, 'dialog').click();
    await fixture.whenStable();
    expect(store.isOpen()).toBe(false);

    await open();
    const escape = new Event('cancel', { cancelable: true });
    query(fixture, 'dialog').dispatchEvent(escape);
    await fixture.whenStable();
    expect(escape.defaultPrevented).toBe(true);
    expect(store.isOpen()).toBe(false);
  });

  it('is empty when opened again', async () => {
    await open();
    await typeIn(fixture, '.search-input', 'pizza');
    await wait(500);
    store.close();
    await fixture.whenStable();

    await open();

    expect(query<HTMLInputElement>(fixture, '.search-input').value).toBe('');
    expect(suggestionNames()).toEqual([]);
  });
});
