import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import { query, stubDialogs, textOf } from '@/testing/dom-testing';
import { Settings } from './settings';

describe('Settings', () => {
  let logout: ReturnType<typeof vi.fn>;
  let deleteAccount: ReturnType<typeof vi.fn>;
  let fetchUserProfile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stubDialogs();
    logout = vi.fn();
    deleteAccount = vi.fn();
    fetchUserProfile = vi.fn(() =>
      of({ id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 2 }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { logout, deleteAccount } },
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

  /**
   * Clicks the element matching `selector`, then waits for the page to update.
   */
  async function click(fixture: ComponentFixture<Settings>, selector: string): Promise<void> {
    query(fixture, selector).click();
    await fixture.whenStable();
  }

  it('logs out through AuthStore', async () => {
    const fixture = await openSettings();

    await click(fixture, '.logout-btn');

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows the logged-in user's real name", async () => {
    const fixture = await openSettings();

    expect(fetchUserProfile).toHaveBeenCalledWith('me');
    expect(textOf(query(fixture, '.user-name'))).toBe('Alexis Melo');
  });

  it('still offers to log out and delete the account when the profile cannot be loaded', async () => {
    fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.user-bar')).toBeNull();
    expect(page.querySelector('.logout-btn')).not.toBeNull();
    expect(page.querySelector('.delete-account-btn')).not.toBeNull();
  });

  it('asks for confirmation before deleting the account, and can be cancelled', async () => {
    const fixture = await openSettings();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('dialog')).toBeNull();

    await click(fixture, '.delete-account-btn');
    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(deleteAccount).not.toHaveBeenCalled();

    await click(fixture, '.cancel-btn');
    expect(page.querySelector('dialog')).toBeNull();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
