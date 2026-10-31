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
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import type { UserProfile } from '@/core/models/user.model';
import { CAN_REVIEW } from '@/core/review/daily-review-testing';
import { query, queryAll, textOf } from '@/testing/dom-testing';

/**
 * Profiles served by the fake API, by user id
 */
const profiles: Record<string, UserProfile> = {
  me: {
    id: 'u1',
    username: 'alexis.melo',
    displayName: 'Alexis Melo',
    avatarUrl: null,
    ratedRestaurantsCount: 2,
  },
  u2: {
    id: 'u2',
    username: 'camille',
    displayName: null,
    avatarUrl: null,
    ratedRestaurantsCount: 2,
  },
};

/**
 * Builds a rating of `restaurantId` given at `date`, with the same score for the three criteria.
 */
function rating(
  restaurantId: string,
  score: number,
  isActive = true,
  date = '2026-03-07T12:00:00+00:00',
): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantAddress: '',
    date,
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive,
  };
}

/**
 * Ratings served by the fake API, by user id
 */
const ratings: Record<string, UserRating[]> = {
  // r1 rated twice: listed once, with the latest (active) rating
  me: [rating('r1', 7), rating('r2', 9), rating('r1', 8, false)],
  u2: [rating('r1', 5), rating('r3', 10)],
};

/**
 * Builds the tierlist `id` of `userId`, pinned to their profile.
 */
function pinnedTierlist(id: number, userId: string): Tierlist {
  return {
    id,
    userId,
    name: `Tierlist ${id}`,
    description: null,
    emoji: '🏆',
    restaurants: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned: true,
  };
}

describe('ProfileView', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;
  let fetchUserRatings: ReturnType<typeof vi.fn>;
  let fetchPinnedTierlistsByUserId: ReturnType<typeof vi.fn>;
  let fetchFollowers: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fetchUserProfile = vi.fn((id = 'me') => of(profiles[id]));
    fetchFollowers = vi.fn(() => of([]));
    fetchUserRatings = vi.fn((id = 'me') => of(ratings[id] ?? []));
    fetchPinnedTierlistsByUserId = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        // The follows of the user shown, under their name; nobody follows anybody unless a test says otherwise
        {
          provide: UserApi,
          useValue: { fetchUserProfile, fetchFollowers, fetchFollowing: () => of([]) },
        },
        // Ratings of the user shown and of the logged-in user, also read by the home page, where the rating allowance
        // locks the "+ New" chip (opened for an unknown user)
        {
          provide: RatingApi,
          useValue: { fetchUserRatings, fetchRatingAllowance: () => of(CAN_REVIEW) },
        },
        {
          provide: TierlistApi,
          useValue: {
            fetchPinnedTierlistsByUserId,
            // Read by the home page
            fetchTierlistsByUserId: () => of([]),
          },
        },
        // Read by the rating page, opened from the "+" of a restaurant
        {
          provide: RestaurantApi,
          useValue: {
            fetchRestaurantById: (id: string) => of({ id, name: `Restaurant ${id}`, emoji: '🍕' }),
          },
        },
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
   * Names of the restaurants of the ranking, in order.
   */
  function listedRestaurants(): string[] {
    return queryAll(harness.fixture, '.list-item').map((i) =>
      textOf(i.querySelector('.item-name')!),
    );
  }

  /**
   * Clicks the sort chip whose text is `label`, and waits for the list to update.
   */
  async function sortBy(label: string): Promise<void> {
    queryAll(harness.fixture, '.choice-chip')
      .find((chip) => textOf(chip) === label)!
      .click();
    await harness.fixture.whenStable();
  }

  it("shows the logged-in user's display name, their username under it, and their number of restaurants rated", async () => {
    await open('/profile');

    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    expect(textOf(query(harness.fixture, '.winner-username'))).toBe('@alexis.melo');
    expect(textOf(query(harness.fixture, '.winner-tag'))).toBe('2 restaurants');
    expect(textOf(query(harness.fixture, '.winner-avatar'))).toBe('A');
  });

  it("shows another user's follows under their name, loaded by their id, with a follow button", async () => {
    fetchFollowers.mockReturnValue(of([profiles['me']]));
    await open('/user/u2');

    expect(fetchFollowers).toHaveBeenCalledWith('u2');
    const follows = query(harness.fixture, '.winner-section app-profile-follows');
    expect(queryAll(harness.fixture, '.count-btn').map(textOf)).toEqual([
      '1 follower',
      '0 following',
    ]);
    expect(textOf(query(harness.fixture, '.follow-btn'))).toBe('Following');
    // Right under the name, above the number of restaurants rated
    expect(follows.previousElementSibling!.classList).toContain('winner-name');
    expect(follows.nextElementSibling!.querySelector('.winner-tag')).not.toBeNull();
  });

  it('offers to edit my own profile, next to my number of restaurants rated', async () => {
    await open('/profile');

    const edit = query(harness.fixture, '.edit-profile-btn');
    expect(textOf(edit)).toBe('Edit profile');
    expect(edit.getAttribute('href')).toBe('/profile/edit');
    expect(edit.previousElementSibling!.classList).toContain('winner-tag');
  });

  it("does not offer to edit another user's profile", async () => {
    await open('/user/u2');

    expect(queryAll(harness.fixture, '.edit-profile-btn')).toHaveLength(0);
  });

  it("puts the follow button next to another user's number of restaurants rated", async () => {
    await open('/user/u2');

    expect(
      queryAll(harness.fixture, '.winner-chips .winner-tag, .winner-chips .follow-btn').map(textOf),
    ).toEqual(['2 restaurants', 'Follow']);
  });

  it('shows my own follows on /profile, loaded by my id rather than "me", without follow button', async () => {
    await open('/profile');

    expect(fetchFollowers).toHaveBeenCalledWith('u1');
    expect(queryAll(harness.fixture, '.count-btn').map(textOf)).toEqual([
      '0 followers',
      '0 following',
    ]);
    expect(queryAll(harness.fixture, '.follow-btn')).toHaveLength(0);
  });

  it('ranks the restaurants the user rated, best first, each listed once', async () => {
    await open('/profile');

    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r2',
      'Restaurant r1',
    ]);
    // The overall score, a round 7: no decimal
    expect(textOf(items[1]!.querySelector('.item-avg')!)).toBe('7');
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
  });

  it('sorts the restaurants by score, the default, by the moment of their rating or by name', async () => {
    // r1 has the lowest score but was rated last
    fetchUserRatings.mockReturnValue(
      of([rating('r1', 7, true, '2026-10-20T12:00:00+00:00'), rating('r2', 9)]),
    );
    await open('/profile');

    const chips = queryAll<HTMLButtonElement>(harness.fixture, '.choice-chip');
    expect(chips.map(textOf)).toEqual(['Score', 'Recently rated', 'A–Z']);
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(listedRestaurants()).toEqual(['Restaurant r2', 'Restaurant r1']);

    await sortBy('Recently rated');
    expect(listedRestaurants()).toEqual(['Restaurant r1', 'Restaurant r2']);

    await sortBy('Score');
    expect(listedRestaurants()).toEqual(['Restaurant r2', 'Restaurant r1']);

    await sortBy('A–Z');
    expect(listedRestaurants()).toEqual(['Restaurant r1', 'Restaurant r2']);
  });

  it('explains when the user has not rated any restaurant, with nothing to sort', async () => {
    fetchUserRatings.mockReturnValue(of([]));
    await open('/profile');

    expect(textOf(query(harness.fixture, '.empty'))).toContain('No restaurant rated yet');
    expect(queryAll(harness.fixture, '.choice-chip')).toHaveLength(0);
  });

  it('explains when the profile cannot be loaded, instead of a blank page', async () => {
    fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));
    await open('/profile');

    expect(textOf(query(harness.fixture, '[role="alert"]'))).toBe(
      "Couldn't load this profile, try again.",
    );
    expect(queryAll(harness.fixture, '.loading')).toHaveLength(0);
  });

  it('explains when the ratings cannot be loaded, instead of saying none were given', async () => {
    fetchUserRatings.mockReturnValue(throwError(() => new Error('503')));
    await open('/profile');

    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    expect(textOf(query(harness.fixture, '.empty'))).toBe("Couldn't load the ratings");
    expect(textOf(harness.fixture.nativeElement)).not.toContain('No restaurant rated yet');
  });

  it('shows another user\'s profile with my own score, or a "?" where I never rated', async () => {
    await open('/user/u2');

    expect(fetchUserProfile).toHaveBeenCalledWith('u2');
    // No display name: the username alone, as the title
    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('camille');
    expect(queryAll(harness.fixture, '.winner-username')).toHaveLength(0);
    const items = queryAll(harness.fixture, '.list-item');
    expect(items.map((i) => textOf(i.querySelector('.item-name')!))).toEqual([
      'Restaurant r3',
      'Restaurant r1',
    ]);
    // Never rated r3: a "?" in the bubble of my score, inside the link to the restaurant page; no link to rate it
    const unrated = items[0]!.querySelector<HTMLElement>('.my-score')!;
    expect(unrated.classList).toContain('my-score-unrated');
    expect(textOf(unrated)).toBe('?');
    expect(unrated.title).toBe("You haven't rated it yet");
    expect(unrated.closest('a')!.getAttribute('href')).toBe('/restaurant/r3');
    expect(queryAll(harness.fixture, 'a[href="/review/r3"]')).toHaveLength(0);
    // Rated r1 twice (7, then 8 before): my active rating
    const myScore = items[1]!.querySelector('.my-score')!;
    expect(textOf(myScore)).toBe('7');
    expect(myScore.classList).not.toContain('my-score-unrated');
  });

  it('shows the tierlists pinned by the user shown, opening them', async () => {
    fetchPinnedTierlistsByUserId.mockReturnValue(
      of([pinnedTierlist(4, 'u2'), pinnedTierlist(9, 'u2')]),
    );
    await open('/user/u2');

    expect(fetchPinnedTierlistsByUserId).toHaveBeenCalledWith('u2');
    expect(queryAll(harness.fixture, '.tierlist-chip-name').map(textOf)).toEqual([
      'Tierlist 4',
      'Tierlist 9',
    ]);
    expect(query(harness.fixture, '.tierlist-chip').getAttribute('href')).toBe('/tierlists/4');
  });

  it('loads my own pinned tierlists on /profile, and hides the section when there is none', async () => {
    await open('/profile');

    // The id of the profile loaded, not the "me" of the API url
    expect(fetchPinnedTierlistsByUserId).toHaveBeenCalledWith('u1');
    expect(textOf(harness.fixture.nativeElement)).not.toContain('Pinned tierlists');
  });

  it('opens my own profile on /profile when reached by my id, loading my ratings once', async () => {
    await open('/user/u1');

    expect(TestBed.inject(Router).url).toBe('/profile');
    expect(textOf(query(harness.fixture, '.winner-name'))).toBe('Alexis Melo');
    // My own profile: no "my score" nor "?", and only my ratings are requested
    expect(queryAll(harness.fixture, '.my-score')).toHaveLength(0);
    expect(fetchUserProfile.mock.calls).toEqual([['me']]);
    expect(fetchUserRatings.mock.calls).toEqual([['me']]);
  });

  it("loads my ratings once more on another user's profile, for my own scores", async () => {
    await open('/user/u2');

    expect(fetchUserRatings.mock.calls).toEqual([['u2'], ['me']]);
  });

  it('goes back home for an unknown user', async () => {
    await open('/user/unknown');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
