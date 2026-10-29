import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserProfile } from '@/core/models/user.model';
import { query, textOf } from '@/testing/dom-testing';
import { Settings } from './settings';

describe('Settings', () => {
  let logout: ReturnType<typeof vi.fn>;
  let fetchUserProfile: ReturnType<typeof vi.fn>;

  /**
   * Profile of the logged-in user, with a display name unless `displayName` says otherwise
   */
  function me(displayName: string | null = 'Alexis Melo'): UserProfile {
    return {
      id: 'u1',
      username: 'alexis.melo',
      displayName,
      avatarUrl: null,
      ratedRestaurantsCount: 2,
    };
  }

  beforeEach(() => {
    logout = vi.fn();
    fetchUserProfile = vi.fn(() => of(me()));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { logout } },
        { provide: UserApi, useValue: { fetchUserProfile } },
      ],
    });
  });

  /**
   * Opens the settings page and waits for the profile to load.
   */
  async function openSettings(): Promise<ComponentFixture<Settings>> {
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    return fixture;
  }

  it('logs out through AuthStore', async () => {
    const fixture = await openSettings();

    query(fixture, '.logout-btn').click();
    await fixture.whenStable();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows the logged-in user's display name above their username, without a link to their profile", async () => {
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;

    expect(fetchUserProfile).toHaveBeenCalledWith('me');
    expect(textOf(query(fixture, '.profile-name'))).toBe('Alexis Melo');
    expect(textOf(query(fixture, '.profile-username'))).toBe('@alexis.melo');
    expect(textOf(query(fixture, '.profile-avatar'))).toBe('A');
    expect(page.querySelector('a[href="/profile"]')).toBeNull();
  });

  it('shows the username alone when the user has no display name', async () => {
    fetchUserProfile.mockReturnValue(of(me(null)));
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;

    expect(textOf(query(fixture, '.profile-name'))).toBe('alexis.melo');
    expect(page.querySelector('.profile-username')).toBeNull();
  });

  it('opens the account settings', async () => {
    const fixture = await openSettings();

    expect(textOf(query(fixture, '.section-link'))).toBe('Account');
    expect(query(fixture, '.section-link').getAttribute('href')).toBe('/settings/account');
  });

  it('shows a placeholder while the profile loads', async () => {
    const answer = new Subject<UserProfile>();
    fetchUserProfile.mockReturnValue(answer);
    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.profile-avatar-skeleton')).not.toBeNull();
    expect(page.querySelector('.profile-name')).toBeNull();

    answer.next(me());
    await fixture.whenStable();

    expect(page.querySelector('.profile-avatar-skeleton')).toBeNull();
    expect(textOf(query(fixture, '.profile-name'))).toBe('Alexis Melo');
  });

  it('explains when the profile cannot be loaded and still offers the account settings and to log out', async () => {
    fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;

    expect(textOf(query(fixture, '.profile-error'))).toBe("Couldn't load your profile");
    expect(page.querySelector('.profile-name')).toBeNull();
    // No placeholder loading forever
    expect(page.querySelector('.profile-avatar-skeleton')).toBeNull();
    expect(page.querySelector('.section-link')).not.toBeNull();
    expect(page.querySelector('.logout-btn')).not.toBeNull();
  });

  it('explains when the logged-in user is not found', async () => {
    fetchUserProfile.mockReturnValue(of(undefined));
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;

    expect(textOf(query(fixture, '.profile-error'))).toBe("Couldn't load your profile");
    expect(page.querySelector('.profile-avatar-skeleton')).toBeNull();
  });
});
