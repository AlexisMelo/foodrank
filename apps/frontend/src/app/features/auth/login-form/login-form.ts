import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { AuthStore } from '@/core/auth/auth-store';

/**
 * Message shown when the login failed: the API answers 401 for a wrong email or password (400 for an invalid body);
 * any other failure (server error, no network) is not the user's fault.
 */
function loginErrorMessage(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  if (status === 401 || status === 400) return 'Invalid email or password.';
  return 'Something went wrong. Please try again.';
}

/**
 * Login tab of the auth card: email and password, with links to the sign up and forgot password forms.
 */
@Component({
  imports: [FormField],
  selector: 'app-login-form',
  styleUrl: './login-form.scss',
  templateUrl: './login-form.html',
})
export class LoginForm {
  /**
   * The Sign up tab is clicked
   */
  readonly goToSignup = output<void>();

  /**
   * The forgot password link is clicked
   */
  readonly goToForgot = output<void>();

  /**
   * Logs in, then opens the home page
   */
  private readonly auth = inject(AuthStore);

  /**
   * True while the login request runs: the fields and the button are disabled
   */
  protected readonly loading = signal(false);

  /**
   * Message of the last failed login, empty when there is none
   */
  protected readonly error = signal('');

  /**
   * Email and password as typed
   */
  private readonly credentials = signal({ email: '', password: '' });

  /**
   * Login fields, both required (the browser checks the email format)
   */
  protected readonly form = form(this.credentials, (credentials) => {
    required(credentials.email);
    required(credentials.password);
    disabled(credentials.email, { when: () => this.loading() });
    disabled(credentials.password, { when: () => this.loading() });
  });

  /**
   * Logs in with the trimmed email; shows an error depending on why it fails.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const { email, password } = this.credentials();
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(email.trim(), password);
    } catch (error) {
      this.error.set(loginErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
