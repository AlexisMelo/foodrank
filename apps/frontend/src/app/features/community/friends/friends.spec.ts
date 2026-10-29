import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserSummary } from '@/core/models/user.model';
import { query, queryAll, textOf, typeIn } from '@/testing/dom-testing';
import { Friends } from './friends';

/**
 * Builds the user `id` named `name`, as the friends endpoint lists them.
 */
function user(id: string, name: string): UserSummary {
  return { id, name, avatarUrl: null };
}

describe('Friends', () => {
  let fetchFriends: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let fixture: ComponentFixture<Friends>;

  beforeEach(() => {
    // In the order of the API: the most recent follow first
    fetchFriends = vi.fn(() =>
      of([user('u2', 'Zoé'), user('u3', 'camille'), user('u4', 'Élodie'), user('u5', 'Hugo')]),
    );
    TestBed.configureTestingModule({
      providers: [
        // The rows and the back arrow are links
        provideRouter([]),
        { provide: UserApi, useValue: { fetchFriends } },
        { provide: AuthStore, useValue: { loggedInUserId: signal('u1') } },
      ],
    });
  });

  /**
   * Opens the page and waits for the friends to load.
   */
  async function open(): Promise<void> {
    fixture = TestBed.createComponent(Friends);
    await fixture.whenStable();
  }

  /**
   * Names of the friends listed, in order.
   */
  function listedNames(): string[] {
    return queryAll(fixture, '.user-row .search-row-name').map(textOf);
  }

  it('lists every friend of the logged-in user from A to Z, ignoring case and accents', async () => {
    await open();

    expect(fetchFriends).toHaveBeenCalledWith('u1');
    expect(listedNames()).toEqual(['camille', 'Élodie', 'Hugo', 'Zoé']);
  });

  it("links each row to the friend's profile, and the back arrow to the community page", async () => {
    await open();

    expect(
      queryAll<HTMLAnchorElement>(fixture, '.user-row').map((row) => row.getAttribute('href')),
    ).toEqual(['/user/u3', '/user/u4', '/user/u5', '/user/u2']);
    expect(query(fixture, '.back-link').getAttribute('href')).toBe('/community');
  });

  it('keeps the friends whose name contains the search, ignoring case and accents', async () => {
    await open();

    await typeIn(fixture, '.search', 'ELO');
    expect(listedNames()).toEqual(['Élodie']);

    await typeIn(fixture, '.search', 'o');
    expect(listedNames()).toEqual(['Élodie', 'Hugo', 'Zoé']);

    await typeIn(fixture, '.search', '  ');
    expect(listedNames()).toEqual(['camille', 'Élodie', 'Hugo', 'Zoé']);
  });

  it('says when no friend matches the search', async () => {
    await open();

    await typeIn(fixture, '.search', ' xyz ');

    expect(listedNames()).toEqual([]);
    expect(textOf(query(fixture, '.no-match'))).toBe('No friend matches “xyz”.');
  });

  it('explains what a friend is when the user has none', async () => {
    fetchFriends.mockReturnValue(of([]));

    await open();

    expect(textOf(query(fixture, '.empty-title'))).toBe('No friends yet');
    expect(queryAll(fixture, '.no-match')).toHaveLength(0);
  });

  it('says the friends could not be loaded', async () => {
    fetchFriends.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    await open();

    expect(textOf(query(fixture, '[role="alert"]'))).toBe("Couldn't load your friends");
    expect(listedNames()).toEqual([]);
  });
});
