import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import { DEFAULT_TIERLIST_EMOJI } from '@/core/utils/tierlist';
import { query, queryAll, textOf, typeIn } from '@/testing/dom-testing';

describe('TierlistCreateView', () => {
  let createTierlist: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    createTierlist = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        // The tierlists page is opened once the tierlist is created
        {
          provide: TierlistApi,
          useValue: { createTierlist, fetchTierlistsByUserId: () => of([]) },
        },
        { provide: UserApi, useValue: {} },
        { provide: RatingApi, useValue: {} },
        { provide: RestaurantApi, useValue: {} },
      ],
    });
    harness = await RouterTestingHarness.create('/tierlists/new');
    await harness.fixture.whenStable();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
  });

  /**
   * The Create button, at the top right.
   */
  function createButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(harness.fixture, '.create-btn');
  }

  /**
   * Clicks Create, like the user does, and waits for the API call to settle.
   */
  async function clickCreate(): Promise<void> {
    createButton().click();
    await harness.fixture.whenStable();
  }

  /**
   * Opens the emojis from the cover, and picks `emoji`.
   */
  async function pickEmoji(emoji: string): Promise<void> {
    query(harness.fixture, '.cover').click();
    await harness.fixture.whenStable();
    queryAll<HTMLButtonElement>(harness.fixture, '.emoji-option')
      .find((o) => textOf(o) === emoji)!
      .click();
    await harness.fixture.whenStable();
  }

  it('only enables Create once the tierlist has a name', async () => {
    expect(createButton().disabled).toBe(true);

    await typeIn(harness.fixture, '#tierlist-name', '   ');
    expect(createButton().disabled).toBe(true);

    await typeIn(harness.fixture, '#tierlist-name', 'Top 10');
    expect(createButton().disabled).toBe(false);

    await typeIn(harness.fixture, '#tierlist-name', '');
    expect(createButton().disabled).toBe(true);
  });

  it('creates an unpinned tierlist with the default emoji and the trimmed name, then opens the tierlists', async () => {
    createTierlist.mockReturnValue(of(undefined));

    await typeIn(harness.fixture, '#tierlist-name', '  Best burgers  ');
    await typeIn(harness.fixture, '#tierlist-description', '   ');
    await clickCreate();

    expect(createTierlist).toHaveBeenCalledWith({
      emoji: DEFAULT_TIERLIST_EMOJI,
      name: 'Best burgers',
      description: null,
      pinned: false,
    });
    expect(navigate).toHaveBeenCalledWith('/tierlists', { replaceUrl: true });
    expect(TestBed.inject(Router).url).toBe('/tierlists');
  });

  it('sends the picked emoji, the description and the pin', async () => {
    createTierlist.mockReturnValue(of(undefined));

    await pickEmoji('🍣');
    await typeIn(harness.fixture, '#tierlist-name', 'Sushi spots');
    await typeIn(harness.fixture, '#tierlist-description', '  Fresh fish only ');
    query(harness.fixture, 'input[role="switch"]').click();
    await harness.fixture.whenStable();
    await clickCreate();

    expect(createTierlist).toHaveBeenCalledWith({
      emoji: '🍣',
      name: 'Sushi spots',
      description: 'Fresh fish only',
      pinned: true,
    });
  });

  it('shows the picked emoji as the picture and closes the emojis, without creating the tierlist', async () => {
    await typeIn(harness.fixture, '#tierlist-name', 'Top 10');
    expect(textOf(query(harness.fixture, '.cover'))).toBe(DEFAULT_TIERLIST_EMOJI);
    expect(queryAll(harness.fixture, '.emoji-grid')).toHaveLength(0);

    await pickEmoji('🍕');

    expect(textOf(query(harness.fixture, '.cover'))).toBe('🍕');
    expect(queryAll(harness.fixture, '.emoji-grid')).toHaveLength(0);
    expect(createTierlist).not.toHaveBeenCalled();
  });

  it('closes the emojis without changing the picture on a tap outside or Escape', async () => {
    query(harness.fixture, '.cover').click();
    await harness.fixture.whenStable();
    query(harness.fixture, '.emoji-backdrop').click();
    await harness.fixture.whenStable();
    expect(queryAll(harness.fixture, '.emoji-grid')).toHaveLength(0);

    query(harness.fixture, '.cover').click();
    await harness.fixture.whenStable();
    query(harness.fixture, '.emoji-option').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await harness.fixture.whenStable();
    expect(queryAll(harness.fixture, '.emoji-grid')).toHaveLength(0);

    expect(textOf(query(harness.fixture, '.cover'))).toBe(DEFAULT_TIERLIST_EMOJI);
    expect(createTierlist).not.toHaveBeenCalled();
  });

  it('asks to log in when the session expired, and stays on the page', async () => {
    createTierlist.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await typeIn(harness.fixture, '#tierlist-name', 'Top 10');
    await clickCreate();

    expect(textOf(query(harness.fixture, '.save-error'))).toBe('Log in to create a tierlist.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a generic error when the API fails, keeping what the user typed', async () => {
    createTierlist.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    await typeIn(harness.fixture, '#tierlist-name', 'Top 10');
    await clickCreate();

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'Could not create your tierlist, try again.',
    );
    expect(query<HTMLInputElement>(harness.fixture, '#tierlist-name').value).toBe('Top 10');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables Create while saving, so the tierlist is not created twice', async () => {
    const save = new Subject<void>();
    createTierlist.mockReturnValue(save);

    await typeIn(harness.fixture, '#tierlist-name', 'Top 10');
    await clickCreate();
    expect(createButton().disabled).toBe(true);
    await clickCreate();

    save.next();
    save.complete();
    await harness.fixture.whenStable();
    expect(createTierlist).toHaveBeenCalledOnce();
  });

  it('goes back to the tierlists from the arrow', () => {
    expect(query(harness.fixture, '.back-link').getAttribute('href')).toBe('/tierlists');
  });
});
