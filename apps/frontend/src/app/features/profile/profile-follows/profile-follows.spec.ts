import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserProfile, UserSummary } from '@/core/models/user.model';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, stubDialogs, textOf, typeIn } from '@/testing/dom-testing';
import { ProfileFollows } from './profile-follows';

/**
 * Builds the user `id` named `name`, as the follow endpoints list them.
 */
function user(id: string, name: string): UserSummary {
  return { id, name, avatarUrl: null };
}

/**
 * Builds the profile of `summary`, as the profile page gives it to the section.
 */
function profileOf(summary: UserSummary): UserProfile {
  return { ...summary, ratedRestaurantsCount: 2 };
}

/**
 * The logged-in user
 */
const me = user('u1', 'Alexis');

/**
 * The user whose profile is shown, unless a test opens another one
 */
const camille = user('u2', 'Camille');

/**
 * A third user
 */
const hugo = user('u3', 'Hugo');

/**
 * Builds the error HttpClient gives when the API answers with `status`.
 */
function httpError(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status }));
}

describe('ProfileFollows', () => {
  let fetchFollowers: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let fetchFollowing: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let follow: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let unfollow: ReturnType<typeof vi.fn<(userId: string) => Observable<UserSummary[]>>>;
  let fixture: ComponentFixture<ProfileFollows>;

  beforeEach(() => {
    stubDialogs();
    // Camille is followed by Hugo and follows nobody, unless a test says otherwise
    fetchFollowers = vi.fn(() => of([hugo]));
    fetchFollowing = vi.fn(() => of([]));
    follow = vi.fn();
    unfollow = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        // The rows of the popup link to the profiles
        provideRouter([]),
        { provide: UserApi, useValue: { fetchFollowers, fetchFollowing, follow, unfollow } },
        { provide: AuthStore, useValue: { loggedInUserId: signal(me.id) } },
      ],
    });
  });

  /**
   * Shows the follows of `shown` (Camille by default) and waits for them to load.
   */
  async function open(shown: UserSummary = camille): Promise<void> {
    fixture = TestBed.createComponent(ProfileFollows);
    fixture.componentRef.setInput('profile', profileOf(shown));
    await fixture.whenStable();
  }

  /**
   * Clicks `element` and waits for the section to update.
   */
  async function click(element: HTMLElement): Promise<void> {
    element.click();
    await fixture.whenStable();
  }

  /**
   * The follow button; fails when there is none.
   */
  function followButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(fixture, '.follow-btn');
  }

  /**
   * Texts of the two counts, followers first.
   */
  function counts(): string[] {
    return queryAll(fixture, '.count-btn').map(textOf);
  }

  /**
   * Messages of the toasts on screen.
   */
  function toasts(): string[] {
    return TestBed.inject(ToastStore)
      .toasts()
      .map((toast) => toast.message);
  }

  /**
   * Names of the users listed in the popup, in order.
   */
  function listedNames(): string[] {
    return queryAll(fixture, '.user-row .search-row-name').map(textOf);
  }

  it('shows the numbers of followers and of users followed of the user shown', async () => {
    fetchFollowers.mockReturnValue(of([hugo, me]));
    fetchFollowing.mockReturnValue(of([hugo]));
    await open();

    expect(fetchFollowers).toHaveBeenCalledWith('u2');
    expect(fetchFollowing).toHaveBeenCalledWith('u2');
    expect(counts()).toEqual(['2 followers', '1 following']);
  });

  it('uses the singular for a single follower', async () => {
    await open();

    expect(counts()).toEqual(['1 follower', '0 following']);
  });

  it('offers to follow a user who does not follow me', async () => {
    await open();

    expect(textOf(followButton())).toBe('Follow');
    expect(followButton().getAttribute('aria-pressed')).toBe('false');
  });

  it('offers to follow back a user who already follows me', async () => {
    fetchFollowing.mockReturnValue(of([me]));
    await open();

    expect(textOf(followButton())).toBe('Follow back');
  });

  it('says "Following" when I already follow the user', async () => {
    fetchFollowers.mockReturnValue(of([me, hugo]));
    fetchFollowing.mockReturnValue(of([me]));
    await open();

    expect(textOf(followButton())).toBe('Following');
    expect(followButton().getAttribute('aria-pressed')).toBe('true');
  });

  it("follows the user, the button and the count showing the API's answer", async () => {
    follow.mockReturnValue(of([me, hugo]));
    await open();

    await click(followButton());

    expect(follow).toHaveBeenCalledWith('u2');
    expect(unfollow).not.toHaveBeenCalled();
    expect(textOf(followButton())).toBe('Following');
    expect(counts()).toEqual(['2 followers', '0 following']);
  });

  it('unfollows the user when I already follow them, offering to follow back', async () => {
    fetchFollowers.mockReturnValue(of([me, hugo]));
    fetchFollowing.mockReturnValue(of([me]));
    unfollow.mockReturnValue(of([hugo]));
    await open();

    await click(followButton());

    expect(unfollow).toHaveBeenCalledWith('u2');
    expect(follow).not.toHaveBeenCalled();
    expect(textOf(followButton())).toBe('Follow back');
    expect(counts()).toEqual(['1 follower', '1 following']);
  });

  it('disables the button while the follow is saved, sending a single request', async () => {
    const answer = new Subject<UserSummary[]>();
    follow.mockReturnValue(answer);
    await open();

    await click(followButton());
    expect(followButton().disabled).toBe(true);
    await click(followButton());
    expect(follow).toHaveBeenCalledTimes(1);

    answer.next([me, hugo]);
    // Lets the section receive the answer, then waits for it to update
    await Promise.resolve();
    await fixture.whenStable();

    expect(followButton().disabled).toBe(false);
    expect(textOf(followButton())).toBe('Following');
  });

  it('shows a toast when the follow fails, and changes nothing', async () => {
    follow.mockReturnValue(httpError(503));
    await open();

    await click(followButton());

    expect(toasts()).toEqual(["Couldn't follow Camille, try again."]);
    expect(textOf(followButton())).toBe('Follow');
    expect(followButton().disabled).toBe(false);
    expect(counts()).toEqual(['1 follower', '0 following']);
  });

  it('shows a toast when the unfollow fails, and changes nothing', async () => {
    fetchFollowers.mockReturnValue(of([me]));
    unfollow.mockReturnValue(httpError(503));
    await open();

    await click(followButton());

    expect(toasts()).toEqual(["Couldn't unfollow Camille, try again."]);
    expect(textOf(followButton())).toBe('Following');
  });

  it('shows the counts but no follow button on my own profile', async () => {
    fetchFollowers.mockReturnValue(of([camille]));
    fetchFollowing.mockReturnValue(of([camille, hugo]));
    await open(me);

    expect(fetchFollowers).toHaveBeenCalledWith('u1');
    expect(counts()).toEqual(['1 follower', '2 following']);
    expect(queryAll(fixture, '.follow-btn')).toHaveLength(0);
  });

  it('opens the followers in a full-screen popup, the most recent first, each row opening the profile', async () => {
    fetchFollowers.mockReturnValue(of([hugo, me]));
    await open();

    await click(query(fixture, '.followers-btn'));

    expect(textOf(query(fixture, 'dialog .title'))).toBe('Followers');
    expect(query(fixture, 'dialog').classList).toContain('overlay-full');
    expect(listedNames()).toEqual(['Hugo', 'Alexis']);
    const rows = queryAll(fixture, '.user-row');
    expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/user/u3', '/user/u1']);
    // Only the name: the API gives no number of restaurants rated in lists
    expect(queryAll(fixture, '.user-row .search-row-detail')).toHaveLength(0);
  });

  it('opens the users followed in the popup', async () => {
    fetchFollowing.mockReturnValue(of([me, hugo]));
    await open();

    await click(query(fixture, '.following-btn'));

    expect(textOf(query(fixture, 'dialog .title'))).toBe('Following');
    expect(listedNames()).toEqual(['Alexis', 'Hugo']);
  });

  it('filters the popup by name, ignoring case, and says when nobody matches', async () => {
    fetchFollowers.mockReturnValue(of([hugo, me]));
    await open();
    await click(query(fixture, '.followers-btn'));

    await typeIn(fixture, '.search', 'HUG');
    expect(listedNames()).toEqual(['Hugo']);

    await typeIn(fixture, '.search', 'zoe');
    expect(listedNames()).toEqual([]);
    expect(textOf(query(fixture, '.search-list-message'))).toBe('No one matches “zoe”.');
  });

  it('says when nobody follows the user, or they follow nobody', async () => {
    fetchFollowers.mockReturnValue(of([]));
    await open();

    await click(query(fixture, '.followers-btn'));
    expect(textOf(query(fixture, '.search-list-message'))).toBe('No followers yet');
    await click(query(fixture, '.close-btn'));

    await click(query(fixture, '.following-btn'));
    expect(textOf(query(fixture, '.search-list-message'))).toBe('Not following anyone yet');
  });

  it('closes the popup with its × button', async () => {
    await open();
    await click(query(fixture, '.followers-btn'));

    await click(query(fixture, '.close-btn'));

    expect(queryAll(fixture, 'dialog')).toHaveLength(0);
  });

  it('closes the popup and loads the follows of the new user when another profile is shown', async () => {
    await open();
    await click(query(fixture, '.followers-btn'));
    fetchFollowers.mockReturnValue(of([me, camille]));

    fixture.componentRef.setInput('profile', profileOf(hugo));
    await fixture.whenStable();

    expect(queryAll(fixture, 'dialog')).toHaveLength(0);
    expect(fetchFollowers).toHaveBeenLastCalledWith('u3');
    expect(counts()).toEqual(['2 followers', '0 following']);
    expect(textOf(followButton())).toBe('Following');
  });

  /**
   * Shows the follows of `shown` (Camille by default) without waiting for them: they stay loading until `followers`
   * answers.
   */
  function openLoading(followers: Subject<UserSummary[]>, shown: UserSummary = camille): void {
    fetchFollowers.mockReturnValue(followers);
    // Rendered without waiting: the followers are not answered, so the section would never be stable
    fixture = TestBed.createComponent(ProfileFollows);
    fixture.componentRef.setInput('profile', profileOf(shown));
    fixture.detectChanges();
  }

  it('shows placeholders of the counts and of the follow button while the follows load, then the follows', async () => {
    const followers = new Subject<UserSummary[]>();
    openLoading(followers);

    expect(query(fixture, '.follows').getAttribute('role')).toBe('status');
    expect(queryAll(fixture, '.counts-skeleton')).toHaveLength(1);
    expect(queryAll(fixture, '.follow-skeleton')).toHaveLength(1);
    expect(queryAll(fixture, 'button')).toHaveLength(0);

    followers.next([hugo]);
    await fixture.whenStable();

    expect(queryAll(fixture, '.skeleton')).toHaveLength(0);
    expect(counts()).toEqual(['1 follower', '0 following']);
    expect(textOf(followButton())).toBe('Follow');
  });

  it('shows no placeholder of the follow button on my own profile, which has no button', () => {
    openLoading(new Subject<UserSummary[]>(), me);

    expect(queryAll(fixture, '.counts-skeleton')).toHaveLength(1);
    expect(queryAll(fixture, '.follow-skeleton')).toHaveLength(0);
  });

  it('hides the section when the follows cannot be loaded, instead of showing wrong counts', async () => {
    fetchFollowing.mockReturnValue(httpError(503));
    await open();

    expect(queryAll(fixture, '.follows')).toHaveLength(0);
  });
});
