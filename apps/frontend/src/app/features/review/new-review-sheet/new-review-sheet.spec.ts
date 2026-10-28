import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import { query, queryAll, stubDialogs, submitForm, typeIn } from '@/testing/dom-testing';
import { NewReviewStore } from '@/core/review/new-review-store';
import { NewReviewSheet } from './new-review-sheet';

/**
 * Empty page standing for the search results page, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

describe('NewReviewSheet', () => {
  let requestLocation: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<NewReviewSheet>;
  let store: NewReviewStore;

  beforeEach(async () => {
    stubDialogs();
    requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPage }]),
        {
          provide: RestaurantApi,
          // Read by the location hint; the sheet itself searches nothing
          useValue: { fetchSearchArea: () => of({ locality: 'Lyon', isDefault: true }) },
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

  /**
   * Opens the sheet, as the tab bar or a "+ New" chip does.
   */
  async function open(): Promise<void> {
    store.open();
    await fixture.whenStable();
  }

  /**
   * Current URL of the app.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  it('opens as a modal dialog, asking for the location and focusing the search field', async () => {
    await open();

    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(requestLocation).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(query(fixture, '.search-input'));
  });

  it('searches nothing while typing: there are no suggestions', async () => {
    await open();

    await typeIn(fixture, '.search-input', 'pizza');

    expect(url()).toBe('/');
    expect(queryAll(fixture, 'li')).toHaveLength(0);
  });

  it('opens the search results on Enter, and closes', async () => {
    await open();
    await typeIn(fixture, '.search-input', '  sushi bar ');

    await submitForm(fixture);

    expect(url()).toBe('/search?q=sushi%20bar');
    expect(store.isOpen()).toBe(false);
  });

  it('opens the search results from the search button', async () => {
    await open();
    await typeIn(fixture, '.search-input', 'camille');

    query(fixture, '.search-btn').click();
    await fixture.whenStable();

    expect(url()).toBe('/search?q=camille');
    expect(store.isOpen()).toBe(false);
  });

  it('stays open without searching when the field is blank', async () => {
    await open();
    await typeIn(fixture, '.search-input', '   ');

    await submitForm(fixture);

    expect(url()).toBe('/');
    expect(store.isOpen()).toBe(true);
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
    store.close();
    await fixture.whenStable();

    await open();

    expect(query<HTMLInputElement>(fixture, '.search-input').value).toBe('');
  });
});
