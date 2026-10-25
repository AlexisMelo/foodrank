import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import type { Tierlist } from '@/core/models/tierlist.model';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, stubDialogs, textOf, typeIn } from '@/testing/dom-testing';
import { AddToTierlistDialog } from './add-to-tierlist-dialog';

/**
 * Builds the tierlist `id` of the logged-in user named `name`, last updated on `updatedDay` of October 2026, holding
 * `restaurantIds`.
 */
function tierlist(
  id: number,
  name: string,
  updatedDay: number,
  restaurantIds: string[] = [],
): Tierlist {
  return {
    id,
    userId: 'u1',
    name,
    description: null,
    emoji: '🏆',
    restaurants: restaurantIds.map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: `2026-10-${String(updatedDay).padStart(2, '0')}T10:00:00Z`,
    pinned: false,
  };
}

/**
 * Builds the error HttpClient gives when the API answers with `status`.
 */
function httpError(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status }));
}

/**
 * Tierlists of the logged-in user served by the fake API: "Top 10" already holds the restaurant r1
 */
const myTierlists = [
  tierlist(1, 'Old favorites', 1),
  tierlist(2, 'Top 10', 20, ['r1', 'r2']),
  tierlist(3, 'Date night', 10, ['r3']),
];

describe('AddToTierlistDialog', () => {
  let fetchTierlistsByUserId: ReturnType<typeof vi.fn>;
  let addRestaurantToTierlist: ReturnType<typeof vi.fn>;
  let removeRestaurantFromTierlist: ReturnType<typeof vi.fn>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let fixture: ComponentFixture<AddToTierlistDialog>;

  beforeEach(() => {
    stubDialogs();
    fetchTierlistsByUserId = vi.fn(() => of(myTierlists));
    addRestaurantToTierlist = vi.fn();
    removeRestaurantFromTierlist = vi.fn();
    closed = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: TierlistApi,
          useValue: {
            fetchTierlistsByUserId,
            addRestaurantToTierlist,
            removeRestaurantFromTierlist,
          },
        },
      ],
    });
  });

  /**
   * Opens the popup for the restaurant r1, Pizza Roma, and waits for the tierlists to load.
   */
  async function open(): Promise<void> {
    fixture = TestBed.createComponent(AddToTierlistDialog);
    fixture.componentRef.setInput('restaurantId', 'r1');
    fixture.componentRef.setInput('restaurantName', 'Pizza Roma');
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
  }

  /**
   * Names of the tierlists listed, in order.
   */
  function listedNames(): string[] {
    return queryAll(fixture, '.tierlist-row-name').map(textOf);
  }

  /**
   * The row of the tierlist named `name`.
   */
  function row(name: string): HTMLElement {
    const found = queryAll(fixture, '.tierlist-row').find(
      (r) => textOf(r.querySelector('.tierlist-row-name')!) === name,
    );
    if (!found) throw new Error(`No row for ${name}`);
    return found;
  }

  /**
   * Taps the tierlist named `name`, and waits for the change to be saved.
   */
  async function tap(name: string): Promise<void> {
    row(name).querySelector<HTMLButtonElement>('.tierlist-row-main')!.click();
    await fixture.whenStable();
  }

  /**
   * Messages of the toasts shown.
   */
  function toastMessages(): string[] {
    return TestBed.inject(ToastStore)
      .toasts()
      .map((toast) => toast.message);
  }

  it('lists my tierlists, the most recently updated first, with their number of restaurants', async () => {
    await open();

    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(listedNames()).toEqual(['Top 10', 'Date night', 'Old favorites']);
    expect(textOf(row('Top 10').querySelector('.tierlist-row-count')!)).toBe('2 restaurants');
  });

  it('filters the tierlists by the search, and says when none matches', async () => {
    await open();

    await typeIn(fixture, '.search', 'DATE');
    expect(listedNames()).toEqual(['Date night']);

    await typeIn(fixture, '.search', 'sushi');
    expect(listedNames()).toEqual([]);
    expect(textOf(query(fixture, '.tierlist-list-message'))).toBe('No tierlist matches “sushi”.');
  });

  it('shows the tierlists already holding the restaurant as added, with a button removing it', async () => {
    await open();

    expect(textOf(row('Top 10').querySelector('.added-badge')!)).toBe('Added ✓');
    expect(row('Top 10').querySelector('.remove-btn')).not.toBeNull();
    expect(row('Date night').querySelector('.added-badge')).toBeNull();
    expect(row('Date night').querySelector('.remove-btn')).toBeNull();
  });

  it('adds the restaurant to the tierlist tapped, which then shows it as added in the same place', async () => {
    addRestaurantToTierlist.mockReturnValue(of(tierlist(3, 'Date night', 25, ['r3', 'r1'])));
    await open();

    await tap('Date night');

    expect(addRestaurantToTierlist).toHaveBeenCalledWith(3, 'r1');
    expect(textOf(row('Date night').querySelector('.added-badge')!)).toBe('Added ✓');
    expect(textOf(row('Date night').querySelector('.tierlist-row-count')!)).toBe('2 restaurants');
    expect(listedNames()).toEqual(['Top 10', 'Date night', 'Old favorites']);
    expect(toastMessages()).toEqual([]);
  });

  it('tells in a toast shown above the popup when the restaurant is already in the tierlist, without asking the API', async () => {
    await open();

    await tap('Top 10');

    expect(addRestaurantToTierlist).not.toHaveBeenCalled();
    expect(toastMessages()).toEqual(['Pizza Roma is already in Top 10.']);
    expect(textOf(query(fixture, 'dialog .toast-message'))).toBe(
      'Pizza Roma is already in Top 10.',
    );
  });

  it('tells in a toast when the API answers the restaurant is already in the tierlist', async () => {
    addRestaurantToTierlist.mockReturnValue(httpError(409));
    await open();

    await tap('Date night');

    expect(toastMessages()).toEqual(['Pizza Roma is already in Date night.']);
  });

  it('tells in a toast when the restaurant cannot be added, the row unchanged', async () => {
    addRestaurantToTierlist.mockReturnValue(httpError(503));
    await open();

    await tap('Date night');

    expect(toastMessages()).toEqual(["Couldn't add Pizza Roma to Date night, try again."]);
    expect(row('Date night').querySelector('.added-badge')).toBeNull();
    expect(row('Date night').querySelector<HTMLButtonElement>('.tierlist-row-main')!.disabled).toBe(
      false,
    );
  });

  it('disables the row while the restaurant is added, so it is not sent twice', async () => {
    const answer = new Subject<Tierlist>();
    addRestaurantToTierlist.mockReturnValue(answer);
    await open();

    await tap('Date night');
    const main = row('Date night').querySelector<HTMLButtonElement>('.tierlist-row-main')!;
    expect(main.disabled).toBe(true);
    main.click();
    expect(addRestaurantToTierlist).toHaveBeenCalledTimes(1);

    answer.next(tierlist(3, 'Date night', 25, ['r3', 'r1']));
    answer.complete();
    // Lets the popup receive the answer, then waits for it to update
    await Promise.resolve();
    await fixture.whenStable();
    expect(row('Date night').querySelector<HTMLButtonElement>('.tierlist-row-main')!.disabled).toBe(
      false,
    );
  });

  it('removes the restaurant from a tierlist, which then shows it as not added', async () => {
    removeRestaurantFromTierlist.mockReturnValue(of(tierlist(2, 'Top 10', 25, ['r2'])));
    await open();

    row('Top 10').querySelector<HTMLButtonElement>('.remove-btn')!.click();
    await fixture.whenStable();

    expect(removeRestaurantFromTierlist).toHaveBeenCalledWith(2, 'r1');
    expect(row('Top 10').querySelector('.added-badge')).toBeNull();
    expect(textOf(row('Top 10').querySelector('.tierlist-row-count')!)).toBe('1 restaurant');
  });

  it('tells in a toast when the restaurant cannot be removed, the row unchanged', async () => {
    removeRestaurantFromTierlist.mockReturnValue(httpError(503));
    await open();

    row('Top 10').querySelector<HTMLButtonElement>('.remove-btn')!.click();
    await fixture.whenStable();

    expect(toastMessages()).toEqual(["Couldn't remove Pizza Roma from Top 10, try again."]);
    expect(row('Top 10').querySelector('.added-badge')).not.toBeNull();
  });

  it('offers to create a tierlist when I have none', async () => {
    fetchTierlistsByUserId.mockReturnValue(of([]));
    await open();

    expect(query(fixture, '.create-link').getAttribute('href')).toBe('/tierlists/new');
  });

  it('explains when my tierlists cannot be loaded', async () => {
    fetchTierlistsByUserId.mockReturnValue(httpError(503));
    await open();

    expect(textOf(query(fixture, '.tierlist-list-error'))).toBe(
      "Couldn't load your tierlists, try again later.",
    );
  });

  it('asks to be closed from its × button', async () => {
    await open();

    query(fixture, '.close-btn').click();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
