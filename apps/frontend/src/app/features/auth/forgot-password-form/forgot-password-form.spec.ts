import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@/app.routes';
import { AuthStore } from '@/core/auth/auth-store';
import { clickButton, query, queryAll, submitForm, textOf, typeIn } from '@/testing/dom-testing';

describe('ForgotPasswordForm', () => {
  let requestPasswordReset: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    requestPasswordReset = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-out user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(false), login: vi.fn(), requestPasswordReset },
        },
      ],
    });
    // The form is opened from the login page
    harness = await RouterTestingHarness.create('/login');
    await clickButton(harness.fixture, 'Forgot your password?');
  });

  /**
   * True when an element matches `selector`.
   */
  function exists(selector: string): boolean {
    return queryAll(harness.fixture, selector).length > 0;
  }

  it('asks for a reset link sent to the trimmed email, then confirms it was sent', async () => {
    requestPasswordReset.mockResolvedValue(undefined);

    await typeIn(harness.fixture, '#forgot-email', '  alex@example.com ');
    await submitForm(harness.fixture);

    expect(requestPasswordReset).toHaveBeenCalledWith('alex@example.com');
    expect(exists('form')).toBe(false);
    expect(textOf(query(harness.fixture, '.success'))).toContain('alex@example.com');
  });

  it('explains a failed request, and lets the user try again', async () => {
    requestPasswordReset.mockRejectedValueOnce(new Error('Network error'));

    await typeIn(harness.fixture, '#forgot-email', 'alex@example.com');
    await submitForm(harness.fixture);

    expect(textOf(query(harness.fixture, '.error'))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(exists('.success')).toBe(false);
    expect(query<HTMLInputElement>(harness.fixture, '#forgot-email').disabled).toBe(false);

    requestPasswordReset.mockResolvedValueOnce(undefined);
    await submitForm(harness.fixture);

    expect(exists('.error')).toBe(false);
    expect(exists('.success')).toBe(true);
  });

  it('disables the field and the button while the request runs, so it is not sent twice', async () => {
    let answer!: () => void;
    const request = new Promise<void>((resolve) => (answer = resolve));
    requestPasswordReset.mockReturnValue(request);

    await typeIn(harness.fixture, '#forgot-email', 'alex@example.com');
    await submitForm(harness.fixture);

    expect(query<HTMLInputElement>(harness.fixture, '#forgot-email').disabled).toBe(true);
    expect(query<HTMLButtonElement>(harness.fixture, 'button[type="submit"]').disabled).toBe(true);

    answer();
    // The form goes on once the request it awaits is answered
    await request;
    await harness.fixture.whenStable();

    expect(exists('.success')).toBe(true);
  });

  it('goes back to the login form', async () => {
    await clickButton(harness.fixture, '← Back to sign in');

    expect(exists('#forgot-email')).toBe(false);
    expect(exists('#login-email')).toBe(true);
  });
});
