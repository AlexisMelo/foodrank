import { HttpErrorResponse } from '@angular/common/http';
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

// The tokens of the reset link are read from the URL fragment, through the router
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

  it('ticks the password rules while typing, and only submits once all are met', async () => {
    harness = await RouterTestingHarness.create(RESET_LINK);
    const button = () => query<HTMLButtonElement>(harness.fixture, 'button[type="submit"]');
    const metCriteria = () => queryAll(harness.fixture, '.criterion.met').map(textOf);

    expect(queryAll(harness.fixture, '.criterion').map(textOf)).toEqual([
      '• At least 8 characters',
      '• At least 1 letter',
      '• At least 1 number',
    ]);
    expect(button().disabled).toBe(true);

    await typeIn(harness.fixture, '#new-password', 'abcdefgh');
    expect(metCriteria()).toEqual(['✓ At least 8 characters', '✓ At least 1 letter']);
    expect(button().disabled).toBe(true);
    await submitForm(harness.fixture);
    expect(auth.resetPassword).not.toHaveBeenCalled();

    await typeIn(harness.fixture, '#new-password', 'abcdefg1');
    expect(metCriteria()).toHaveLength(3);
    expect(button().disabled).toBe(false);
  });

  /**
   * Opens the reset link, types a valid password and submits it, the reset failing with `error`.
   */
  async function failReset(error: HttpErrorResponse): Promise<void> {
    auth.resetPassword.mockRejectedValue(error);
    harness = await RouterTestingHarness.create(RESET_LINK);

    await typeIn(harness.fixture, '#new-password', 'abcdefg1');
    await submitForm(harness.fixture);
  }

  it('says the link may have expired when the API refuses it (401), and stays on the page', async () => {
    await failReset(new HttpErrorResponse({ status: 401 }));

    expect(textOf(query(harness.fixture, '.error'))).toBe(
      'Could not reset password. The link may have expired.',
    );
    expect(auth.checkSession).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
    expect(query<HTMLButtonElement>(harness.fixture, 'button[type="submit"]').disabled).toBe(false);
  });

  it('recalls the password rules when the API finds the password invalid (400)', async () => {
    // Body of an ASP.NET validation error: no { error } message
    await failReset(new HttpErrorResponse({ status: 400, error: { errors: { Password: ['…'] } } }));

    expect(textOf(query(harness.fixture, '.error'))).toBe(
      'The password must follow the rules above. Please choose another one.',
    );
  });

  it('shows why the API refused the password when it says so (400)', async () => {
    await failReset(
      new HttpErrorResponse({
        status: 400,
        error: { error: 'The new password must be different from the current one.' },
      }),
    );

    expect(textOf(query(harness.fixture, '.error'))).toBe(
      'The new password must be different from the current one.',
    );
  });

  it('shows a generic error when the server fails', async () => {
    await failReset(new HttpErrorResponse({ status: 503 }));

    expect(textOf(query(harness.fixture, '.error'))).toBe('Something went wrong. Please try again.');
  });

  it('shows a generic error when there is no network', async () => {
    // HttpClient reports a request that never got an answer with status 0
    await failReset(new HttpErrorResponse({ status: 0 }));

    expect(textOf(query(harness.fixture, '.error'))).toBe('Something went wrong. Please try again.');
  });
});
