import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, stubDialogs, textOf, typeIn } from '@/testing/dom-testing';
import { AddRestaurantsDialog } from './add-restaurants-dialog';

/**
 * Builds a rating by the owner of `restaurantId`, named `name` and located at `address`, given on `day` of October
 * 2026; the active one of the restaurant unless `isActive` is false.
 */
function rating(
  restaurantId: string,
  name: string,
  address: string,
  day: number,
  isActive = true,
): UserRating {
  return {
    restaurantId,
    restaurantName: name,
    restaurantEmoji: '🍕',
    restaurantCuisine: '',
    restaurantAddress: address,
    date: `2026-10-${String(day).padStart(2, '0')}T12:00:00+00:00`,
    food: 50,
    service: 50,
    setting: 50,
    bonus: false,
    isActive,
  };
}

/**
 * Builds the owner's tierlist 7, Date night, holding `restaurantIds`, last updated at `updatedAt`.
 */
function tierlist(restaurantIds: string[], updatedAt = '2026-10-01T10:00:00Z'): Tierlist {
  return {
    id: 7,
    userId: 'u1',
    name: 'Date night',
    description: null,
    emoji: '🕯️',
    restaurants: restaurantIds.map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt,
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
 * Ratings of the owner, the most recent first as the API sends them: Sushi Bar rated twice, Pizza Roma already in the
 * tierlist (see `open`)
 */
const myRatings = [
  rating('r3', 'Sushi Bar', '3 quai Vendeuvre, Caen', 20),
  rating('r2', 'Crêperie du Port', '', 15),
  rating('r1', 'Pizza Roma', '1 rue de Caen', 10),
  rating('r3', 'Sushi Bar', '3 quai Vendeuvre, Caen', 5, false),
];

describe('AddRestaurantsDialog', () => {
  let addRestaurantToTierlist: ReturnType<typeof vi.fn>;
  let tierlistChange: ReturnType<typeof vi.fn<(tierlist: Tierlist) => void>>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let fixture: ComponentFixture<AddRestaurantsDialog>;

  beforeEach(() => {
    stubDialogs();
    addRestaurantToTierlist = vi.fn();
    tierlistChange = vi.fn();
    closed = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: TierlistApi, useValue: { addRestaurantToTierlist } }],
    });
  });

  /**
   * Opens the popup for the tierlist Date night holding Pizza Roma, with the owner's `ratings`.
   */
  async function open(ratings: UserRating[] = myRatings): Promise<void> {
    fixture = TestBed.createComponent(AddRestaurantsDialog);
    fixture.componentRef.setInput('tierlist', tierlist(['r1']));
    fixture.componentRef.setInput('ratings', ratings);
    fixture.componentInstance.tierlist.subscribe(tierlistChange);
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
  }

  /**
   * Names of the restaurants listed, in order.
   */
  function listedNames(): string[] {
    return queryAll(fixture, '.search-row-name').map(textOf);
  }

  /**
   * The row of the restaurant named `name`.
   */
  function row(name: string): HTMLElement {
    const found = queryAll(fixture, '.search-row').find(
      (r) => textOf(r.querySelector('.search-row-name')!) === name,
    );
    if (!found) throw new Error(`No row for ${name}`);
    return found;
  }

  /**
   * The button adding the restaurant named `name`.
   */
  function addButton(name: string): HTMLButtonElement {
    return row(name).querySelector<HTMLButtonElement>('.add-btn')!;
  }

  /**
   * Clicks the button adding the restaurant named `name`, and waits for it to be added.
   */
  async function add(name: string): Promise<void> {
    addButton(name).click();
    await fixture.whenStable();
  }

  /**
   * Messages of the toasts shown, with their kind.
   */
  function toasts(): string[] {
    return TestBed.inject(ToastStore)
      .toasts()
      .map((toast) => `${toast.kind}: ${toast.message}`);
  }

  /**
   * Ids of the restaurants of the tierlist the popup last gave the page.
   */
  function savedRestaurantIds(): string[] {
    return tierlistChange.mock.lastCall![0].restaurants.map((entry) => entry.restaurantId);
  }

  it('lists the restaurants I rated not in the tierlist yet, each once, the most recently rated first', async () => {
    await open();

    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(listedNames()).toEqual(['Sushi Bar', 'Crêperie du Port']);
  });

  it('shows the emoji, the name and the address of each restaurant, when it is known', async () => {
    await open();

    expect(textOf(row('Sushi Bar').querySelector('.search-row-cover')!)).toBe('🍕');
    expect(textOf(row('Sushi Bar').querySelector('.search-row-detail')!)).toBe(
      '3 quai Vendeuvre, Caen',
    );
    expect(row('Crêperie du Port').querySelector('.search-row-detail')).toBeNull();
    expect(addButton('Sushi Bar').getAttribute('aria-label')).toBe('Add Sushi Bar to Date night');
  });

  it('filters the restaurants by the search, and says when none matches', async () => {
    await open();

    await typeIn(fixture, '.search', 'crepe');
    expect(listedNames()).toEqual(['Crêperie du Port']);

    await typeIn(fixture, '.search', 'burger');
    expect(listedNames()).toEqual([]);
    expect(textOf(query(fixture, '.search-list-message'))).toBe('No restaurant matches “burger”.');
  });

  it('adds the restaurant to the tierlist, which then leaves the list, and confirms it in a toast', async () => {
    addRestaurantToTierlist.mockReturnValue(of(tierlist(['r1', 'r3'], '2026-10-25T10:00:00Z')));
    await open();

    await add('Sushi Bar');

    expect(addRestaurantToTierlist).toHaveBeenCalledWith(7, 'r3');
    expect(listedNames()).toEqual(['Crêperie du Port']);
    expect(savedRestaurantIds()).toEqual(['r1', 'r3']);
    expect(toasts()).toEqual(['success: Sushi Bar added to Date night.']);
    expect(textOf(query(fixture, 'dialog .toast-message'))).toBe('Sushi Bar added to Date night.');
  });

  it('confirms each restaurant added, then says when every restaurant I rated is in the tierlist', async () => {
    addRestaurantToTierlist
      .mockReturnValueOnce(of(tierlist(['r1', 'r3'])))
      .mockReturnValueOnce(of(tierlist(['r1', 'r3', 'r2'])));
    await open();

    await add('Sushi Bar');
    await add('Crêperie du Port');

    expect(toasts()).toEqual([
      'success: Sushi Bar added to Date night.',
      'success: Crêperie du Port added to Date night.',
    ]);
    expect(listedNames()).toEqual([]);
    expect(textOf(query(fixture, '.search-list-message'))).toBe(
      'Every restaurant you rated is in Date night.',
    );
  });

  it('keeps every restaurant added when two additions are sent together, each answer missing the other', async () => {
    const answers: Record<string, Subject<Tierlist>> = { r2: new Subject(), r3: new Subject() };
    addRestaurantToTierlist.mockImplementation(
      (_id: number, restaurantId: string) => answers[restaurantId],
    );
    await open();

    await add('Sushi Bar');
    await add('Crêperie du Port');
    // The API read the tierlist before either restaurant was added; the second answer arrives first
    answers['r2']!.next(tierlist(['r1', 'r2']));
    answers['r3']!.next(tierlist(['r1', 'r3']));
    // Lets the popup receive the answers, then waits for it to update
    await Promise.resolve();
    await fixture.whenStable();

    expect(savedRestaurantIds()).toEqual(['r1', 'r2', 'r3']);
    expect(listedNames()).toEqual([]);
  });

  it('disables the button while the restaurant is added, so it is not sent twice', async () => {
    addRestaurantToTierlist.mockReturnValue(new Subject<Tierlist>());
    await open();

    await add('Sushi Bar');
    expect(addButton('Sushi Bar').disabled).toBe(true);
    expect(addButton('Crêperie du Port').disabled).toBe(false);
    addButton('Sushi Bar').click();

    expect(addRestaurantToTierlist).toHaveBeenCalledTimes(1);
  });

  it('tells in a toast when the restaurant cannot be added, the restaurant staying in the list', async () => {
    addRestaurantToTierlist.mockReturnValue(httpError(503));
    await open();

    await add('Sushi Bar');

    expect(toasts()).toEqual(["error: Couldn't add Sushi Bar to Date night, try again."]);
    expect(listedNames()).toEqual(['Sushi Bar', 'Crêperie du Port']);
    expect(addButton('Sushi Bar').disabled).toBe(false);
    expect(tierlistChange).not.toHaveBeenCalled();
  });

  it('tells in a toast when the API answers the restaurant is already in the tierlist', async () => {
    addRestaurantToTierlist.mockReturnValue(httpError(409));
    await open();

    await add('Sushi Bar');

    expect(toasts()).toEqual(['error: Sushi Bar is already in Date night.']);
  });

  it('explains that only the restaurants I rated can be added, when I rated none', async () => {
    await open([]);

    expect(textOf(query(fixture, '.search-list-message'))).toBe(
      "Only the restaurants you rated can be added, and you haven't rated any yet.",
    );
  });

  it('asks to be closed from its × button', async () => {
    await open();

    query(fixture, '.close-btn').click();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
