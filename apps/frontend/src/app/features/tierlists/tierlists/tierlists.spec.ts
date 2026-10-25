import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { Tierlist, TierlistInput } from '@/core/models/tierlist.model';
import { query, queryAll, textOf, typeIn } from '@/testing/dom-testing';

/**
 * In-memory replacement of the API: tierlists created by createTierlist are returned by fetchTierlistsByUserId
 */
const api = {
  /**
   * Tierlists of the logged-in user, in creation order
   */
  tierlists: [] as Tierlist[],

  /**
   * True to make fetchTierlistsByUserId fail
   */
  loadFails: false,
};

/**
 * Fake of TierlistApi reading and writing `api`
 */
const fakeTierlistApi = {
  fetchTierlistsByUserId: () => {
    if (api.loadFails) return throwError(() => new Error('503'));
    // Most recently created first, like the API
    return of([...api.tierlists].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  createTierlist: (input: TierlistInput) => {
    const now = new Date().toISOString();
    api.tierlists.push({
      ...input,
      id: api.tierlists.length + 1,
      userId: 'u1',
      restaurants: [],
      createdAt: now,
      updatedAt: now,
    });
    return of(undefined);
  },
  // Read by the tierlist page, opened from the list
  fetchTierlistById: (id: string) => of(api.tierlists.find((t) => String(t.id) === id)),
};

/**
 * Stores a tierlist of the logged-in user.
 */
function addTierlist(
  name: string,
  createdAt: string,
  updatedAt = createdAt,
  restaurantCount = 0,
  pinned = false,
): void {
  api.tierlists.push({
    id: api.tierlists.length + 1,
    userId: 'u1',
    name,
    description: null,
    emoji: '🏆',
    restaurants: Array.from({ length: restaurantCount }, (_, i) => ({
      restaurantId: `r${i}`,
      addedAt: updatedAt,
    })),
    createdAt,
    updatedAt,
    pinned,
  });
}

describe('TierlistsView', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    api.tierlists = [];
    api.loadFails = false;
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        { provide: TierlistApi, useValue: fakeTierlistApi },
        // Read by the tierlist page, opened from the list
        {
          provide: UserApi,
          useValue: {
            fetchUserProfile: () =>
              of({ id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 0 }),
          },
        },
        { provide: RatingApi, useValue: { fetchUserRatings: () => of([]) } },
        { provide: RestaurantApi, useValue: {} },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  /**
   * Opens `path` in the app and waits for it to load.
   */
  async function open(path: string): Promise<void> {
    await harness.navigateByUrl(path);
    await harness.fixture.whenStable();
  }

  /**
   * Names of the tierlists listed, in display order.
   */
  function listedNames(): string[] {
    return queryAll(harness.fixture, '.tierlist-card .name').map(textOf);
  }

  /**
   * Clicks the sort chip whose text is `label`, and waits for the list to update.
   */
  async function sortBy(label: string): Promise<void> {
    queryAll<HTMLButtonElement>(harness.fixture, '.sort-chip')
      .find((c) => textOf(c) === label)!
      .click();
    await harness.fixture.whenStable();
  }

  it("lists the logged-in user's tierlists, most recently updated first, with their restaurant count", async () => {
    addTierlist('Old favorites', '2026-01-01T10:00:00Z', '2026-10-01T10:00:00Z', 1);
    addTierlist('Fresh picks', '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 3);
    await open('/tierlists');

    expect(listedNames()).toEqual(['Old favorites', 'Fresh picks']);
    const counts = queryAll(harness.fixture, '.tierlist-card .count').map(textOf);
    expect(counts).toEqual(['1 restaurant', '3 restaurants']);
  });

  it('offers to sort by last update, the default, by number of restaurants or by name', async () => {
    await open('/tierlists');

    const chips = queryAll(harness.fixture, '.sort-chip');
    expect(chips.map(textOf)).toEqual(['Recently updated', 'Number of restaurants', 'A–Z']);
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  });

  it('sorts the tierlists by number of restaurants or by name, then by last update again', async () => {
    addTierlist('Burgers', '2026-01-01T10:00:00Z', '2026-10-01T10:00:00Z', 1);
    addTierlist('Sushi', '2026-05-01T10:00:00Z', '2026-05-01T10:00:00Z', 3);
    addTierlist('Arepas', '2026-03-01T10:00:00Z', '2026-03-01T10:00:00Z', 1);
    await open('/tierlists');

    // The most restaurants first; Burgers and Arepas hold as many, Burgers updated last
    await sortBy('Number of restaurants');
    expect(listedNames()).toEqual(['Sushi', 'Burgers', 'Arepas']);

    await sortBy('A–Z');
    expect(listedNames()).toEqual(['Arepas', 'Burgers', 'Sushi']);

    await sortBy('Recently updated');
    expect(listedNames()).toEqual(['Burgers', 'Sushi', 'Arepas']);
  });

  it('marks the tierlists pinned to the profile', async () => {
    addTierlist('Pinned picks', '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 0, true);
    addTierlist('Not pinned', '2026-01-01T10:00:00Z');
    await open('/tierlists');

    const pinned = queryAll(harness.fixture, '.tierlist-card').map(
      (c) => c.querySelector('.pinned-badge') !== null,
    );
    expect(listedNames()).toEqual(['Pinned picks', 'Not pinned']);
    expect(pinned).toEqual([true, false]);
    expect(query(harness.fixture, '.pinned-badge').getAttribute('aria-label')).toBe(
      'Pinned to profile',
    );
  });

  it('opens a tierlist when clicked', async () => {
    addTierlist('Fresh picks', '2026-09-01T10:00:00Z');
    await open('/tierlists');

    query(harness.fixture, '.tierlist-card').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/tierlists/1');
  });

  it('invites to create a first tierlist when the user has none', async () => {
    await open('/tierlists');

    expect(textOf(query(harness.fixture, '.empty-title'))).toBe('No tierlists yet');
  });

  it('explains when the tierlists could not be loaded', async () => {
    api.loadFails = true;
    await open('/tierlists');

    expect(textOf(query(harness.fixture, '.empty-title'))).toBe("Couldn't load your tierlists");
  });

  it('lists a tierlist right after its creation, back from the creation page', async () => {
    addTierlist('Old favorites', '2026-01-01T10:00:00Z');
    await open('/tierlists');
    const newChip = query(harness.fixture, '.add-chip');
    expect(newChip.getAttribute('href')).toBe('/tierlists/new');

    newChip.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/tierlists/new');

    await typeIn(harness.fixture, '#tierlist-name', 'Sushi spots');
    query(harness.fixture, '.create-btn').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/tierlists');
    expect(listedNames()).toEqual(['Sushi spots', 'Old favorites']);
  });
});
