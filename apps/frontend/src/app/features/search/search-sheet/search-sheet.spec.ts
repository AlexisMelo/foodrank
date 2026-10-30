import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LocationStore } from '@/core/location/location-store';
import { query, queryAll, stubDialogs, submitForm, typeIn } from '@/testing/dom-testing';
import { SearchSheetStore } from '@/core/search/search-sheet-store';
import { SearchSheet } from './search-sheet';

/**
 * Empty page standing for the search results page, which these tests do not need.
 */
@Component({ template: '' })
class StubPage {}

describe('SearchSheet', () => {
  let refreshLocation: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<SearchSheet>;
  let store: SearchSheetStore;

  beforeEach(async () => {
    stubDialogs();
    refreshLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPage }]),
        {
          provide: LocationStore,
          // The status and the city are read by the location hint
          useValue: {
            status: signal('idle'),
            city: signal('Lyon'),
            refreshLocation,
          },
        },
      ],
    });
    store = TestBed.inject(SearchSheetStore);
    fixture = TestBed.createComponent(SearchSheet);
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

  it('opens as a modal dialog, refreshing the location and focusing the search field', async () => {
    await open();

    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(refreshLocation).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(query(fixture, '.search-input'));
  });

  it('refreshes the location each time it opens', async () => {
    await open();
    store.close();
    await fixture.whenStable();

    await open();

    expect(refreshLocation).toHaveBeenCalledTimes(2);
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
