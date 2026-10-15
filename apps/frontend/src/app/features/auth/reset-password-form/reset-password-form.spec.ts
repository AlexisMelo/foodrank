import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '@/core/auth/auth-store';
import { query, queryAll, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { ResetPasswordForm } from './reset-password-form';

/**
 * Empty page standing for the home page.
 */
@Component({ template: '' })
class StubPage {}

/**
 * URL of a reset password link, as sent by email.
 */
const RESET_LINK = '/auth/reset-password#access_token=access&refresh_token=refresh&type=recovery';

// Not in the Vue specs: reading the tokens of the link is done through the router in Angular
describe('ResetPasswordForm', () => {
  /**
   * Fake of the AuthStore methods the form calls
   */
  let auth: {
    /**
     * Fake of AuthStore.resetPassword
     */
    resetPassword: ReturnType<typeof vi.fn>;

    /**
     * Fake of AuthStore.checkSession
     */
    checkSession: ReturnType<typeof vi.fn>;
  };
  let harness: RouterTestingHarness;

  beforeEach(() => {
    auth = { resetPassword: vi.fn(), checkSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: StubPage },
          { path: 'auth/reset-password', component: ResetPasswordForm },
        ]),
        { provide: AuthStore, useValue: auth },
      ],
    });
  });

  it('explains that a link without its tokens is invalid', async () => {
    harness = await RouterTestingHarness.create('/auth/reset-password');

    expect(textOf(query(harness.fixture, '.invalid-title'))).toBe('Invalid or expired link');
    expect(queryAll(harness.fixture, 'form')).toHaveLength(0);
  });

  it('removes the tokens from the URL, then sets the new password with them and opens the home page', async () => {
    auth.resetPassword.mockResolvedValue(undefined);
    auth.checkSession.mockResolvedValue(undefined);
    harness = await RouterTestingHarness.create(RESET_LINK);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/reset-password');

    await typeIn(harness.fixture, '#new-password', 'abcdefg1');
    await submitForm(harness.fixture);

    expect(auth.resetPassword).toHaveBeenCalledWith({
      accessToken: 'access',
      refreshToken: 'refresh',
      password: 'abcdefg1',
    });
    expect(auth.checkSession).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('explains a failed reset and stays on the page', async () => {
    auth.resetPassword.mockRejectedValue(new Error('401'));
    harness = await RouterTestingHarness.create(RESET_LINK);

    await typeIn(harness.fixture, '#new-password', 'abcdefg1');
    await submitForm(harness.fixture);

    expect(textOf(query(harness.fixture, '.error'))).toBe(
      'Could not reset password. The link may have expired.',
    );
    expect(auth.checkSession).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
  });
});
