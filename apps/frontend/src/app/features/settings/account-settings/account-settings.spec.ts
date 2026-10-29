import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';
import { query, stubDialogs } from '@/testing/dom-testing';
import { AccountSettings } from './account-settings';

describe('AccountSettings', () => {
  let deleteAccount: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stubDialogs();
    deleteAccount = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: { deleteAccount } }],
    });
  });

  it('goes back to the settings page', async () => {
    const fixture = TestBed.createComponent(AccountSettings);
    await fixture.whenStable();

    expect(query(fixture, '.back-link').getAttribute('href')).toBe('/settings');
  });

  it('asks for confirmation before deleting the account, and can be cancelled', async () => {
    const fixture = TestBed.createComponent(AccountSettings);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('dialog')).toBeNull();

    query(fixture, '.delete-account-btn').click();
    await fixture.whenStable();
    expect(query<HTMLDialogElement>(fixture, 'dialog').open).toBe(true);
    expect(deleteAccount).not.toHaveBeenCalled();

    query(fixture, '.cancel-btn').click();
    await fixture.whenStable();
    expect(page.querySelector('dialog')).toBeNull();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
