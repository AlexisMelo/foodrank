import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSuggestion } from '@/core/models/restaurant.model';
import { query, queryAll, stubDialogs, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { NewReviewStore } from '../new-review-store';
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

describe('NewReviewSheet', () => {
  let autocompletePlaces: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<NewReviewSheet>;
  let store: NewReviewStore;

  beforeEach(async () => {
    stubDialogs();
    // Only the timers of the debounce (rxjs uses setInterval): Angular keeps scheduling its rendering with setTimeout
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    autocompletePlaces = vi.fn(() => of([place('N1', 'Pizza Roma'), place('N2', 'Pizza Napoli')]));
    requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPage }]),
        {
          provide: RestaurantApi,
          useValue: {
            autocompletePlaces,
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

  it('opens the restaurant page of the place picked, and closes', async () => {
    autocompletePlaces.mockReturnValue(of([place('node/42', 'Pizza Roma')]));
    await open();
    await typeIn(fixture, '.search-input', 'pizza');
    await wait(500);

    query(fixture, '.suggestion-item').click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/restaurant/place/node%2F42');
    expect(store.isOpen()).toBe(false);
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
