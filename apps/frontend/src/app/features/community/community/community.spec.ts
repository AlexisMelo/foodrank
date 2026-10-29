import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { FollowedRating } from '@/core/models/rating.model';
import type { UserSummary } from '@/core/models/user.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { Community } from './community';

/**
 * Builds the user `id` named `name`, as the friends endpoint lists them.
 */
function user(id: string, name: string): UserSummary {
  return { id, name, avatarUrl: null };
}

/**
 * Builds a rating of `restaurantId` by the user `userId` named `userName`, on `date`.
 */
function followedRating(
  userId: string,
  userName: string,
  restaurantId: string,
  date = '2026-03-07T12:00:00+00:00',
): FollowedRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    date,
    food: 90,
    service: 60,
    setting: 30,
    bonus: false,
    isActive: true,
    userId,
    userName,
    userAvatarUrl: null,
  };
}

/**
 * Builds the error HttpClient gives when the API answers with `status`.
 */
function httpError(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status }));
}

/**
 * Seven users, all friends of the logged-in user unless a test says otherwise
 */
const sevenFriends = ['Camille', 'Hugo', 'Léa', 'Marc', 'Nina', 'Paul', 'Zoé'].map((name, i) =>
  user(`u${i + 2}`, name),
);

describe('Community', () => {
  let fetchFriends: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let fetchFollowedRatings: ReturnType<
    typeof vi.fn<(limit?: number) => Observable<FollowedRating[]>>
  >;
  let fixture: ComponentFixture<Community>;

  beforeEach(() => {
    fetchFriends = vi.fn(() => of(sevenFriends));
    fetchFollowedRatings = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        // The friends and the cards link to the profiles and the restaurants
        provideRouter([]),
        { provide: UserApi, useValue: { fetchFriends } },
        { provide: RatingApi, useValue: { fetchFollowedRatings } },
        { provide: AuthStore, useValue: { loggedInUserId: signal('u1') } },
      ],
    });
  });

  /**
   * Opens the page and waits for the friends and the reviews to load.
   */
  async function open(): Promise<void> {
    fixture = TestBed.createComponent(Community);
    await fixture.whenStable();
  }

  /**
   * Names of the friends shown in the Friends section, in order.
   */
  function shownFriendNames(): string[] {
    return queryAll(fixture, '.friends-section .friend-name').map(textOf);
  }

  it('loads the friends of the logged-in user by their real id, and the 5 latest reviews of the users they follow', async () => {
    await open();

    expect(fetchFriends).toHaveBeenCalledWith('u1');
    expect(fetchFollowedRatings).toHaveBeenCalledWith(5);
  });

  it('shows 5 of the friends, each one at most once, each linking to their profile', async () => {
    await open();

    const names = shownFriendNames();
    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
    expect(names.every((name) => sevenFriends.some((friend) => friend.name === name))).toBe(true);
    for (const link of queryAll<HTMLAnchorElement>(fixture, '.friends-section .friend-chip')) {
      const name = textOf(link.querySelector('.friend-name') as Element);
      const friend = sevenFriends.find((f) => f.name === name);
      expect(link.getAttribute('href')).toBe(`/user/${friend?.id}`);
    }
  });

  it('shows every friend when there are fewer than 5, with "See all" opening the friends page', async () => {
    fetchFriends.mockReturnValue(of([user('u2', 'Camille'), user('u3', 'Hugo')]));

    await open();

    expect(shownFriendNames().sort()).toEqual(['Camille', 'Hugo']);
    expect(query(fixture, '.friends-section .see-all-chip').getAttribute('href')).toBe(
      '/community/friends',
    );
  });

  it('explains what a friend is, without "See all", when the user has no friend', async () => {
    fetchFriends.mockReturnValue(of([]));

    await open();

    expect(textOf(query(fixture, '.friends-section .empty'))).toContain('No friends yet');
    expect(queryAll(fixture, '.friends-section .see-all-chip')).toHaveLength(0);
  });

  it('says the friends could not be loaded, the reviews still showing', async () => {
    fetchFriends.mockReturnValue(httpError(503));
    fetchFollowedRatings.mockReturnValue(of([followedRating('u2', 'Camille', 'r1')]));

    await open();

    expect(textOf(query(fixture, '.friends-section .empty'))).toBe("Couldn't load your friends");
    expect(queryAll(fixture, '.friends-section .see-all-chip')).toHaveLength(0);
    expect(queryAll(fixture, '.reviews-section app-followed-review-card')).toHaveLength(1);
  });

  it('shows the latest reviews in the order given, each card opening the restaurant and its author chip the profile', async () => {
    fetchFollowedRatings.mockReturnValue(
      of([
        followedRating('u2', 'Camille', 'r1', '2026-03-08T12:00:00+00:00'),
        followedRating('u3', 'Hugo', 'r1', '2026-03-07T12:00:00+00:00'),
      ]),
    );

    await open();

    const cards = queryAll<HTMLAnchorElement>(fixture, '.reviews-section .review-card');
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/restaurant/r1',
      '/restaurant/r1',
    ]);
    expect(queryAll(fixture, '.reviews-section .author-name').map(textOf)).toEqual([
      'Camille',
      'Hugo',
    ]);
    const authorLinks = queryAll<HTMLAnchorElement>(fixture, '.reviews-section .author-chip');
    expect(authorLinks.map((chip) => chip.getAttribute('href'))).toEqual(['/user/u2', '/user/u3']);
  });

  it('dims a previous rating replaced by a more recent one of the same author', async () => {
    fetchFollowedRatings.mockReturnValue(
      of([{ ...followedRating('u2', 'Camille', 'r1'), isActive: false }]),
    );

    await open();

    expect(query(fixture, '.reviews-section .review-card').classList).toContain('inactive');
  });

  it('says when the users followed have not reviewed anything yet', async () => {
    await open();

    expect(textOf(query(fixture, '.reviews-section .empty'))).toContain(
      'No review yet from the people you follow',
    );
  });

  it('says the reviews could not be loaded, the friends still showing', async () => {
    fetchFollowedRatings.mockReturnValue(httpError(503));

    await open();

    expect(textOf(query(fixture, '.reviews-section .empty'))).toBe("Couldn't load the reviews");
    expect(shownFriendNames()).toHaveLength(5);
  });
});
