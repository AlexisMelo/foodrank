import { Component, inject, output, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { AuthStore } from '@/core/auth/auth-store';

/**
 * Login tab of the auth card, forgot password mode: asks for a reset link by email.
 */
@Component({
  imports: [FormField],
  selector: 'app-forgot-password-form',
  styleUrl: './forgot-password-form.scss',
  templateUrl: './forgot-password-form.html',
})
export class ForgotPasswordForm {
  /**
   * The back to sign in link is clicked
   */
  readonly goToLogin = output<void>();

  /**
   * Sends the reset link request
   */
  private readonly auth = inject(AuthStore);

  /**
   * True while the request runs: the field and the button are disabled
   */
  protected readonly loading = signal(false);

  /**
   * True once the request succeeded: the form is replaced by a confirmation
   */
  protected readonly sent = signal(false);

  /**
   * Message of the last failed request, empty when there is none
   */
  protected readonly error = signal('');

  /**
   * Email as typed, shown in the confirmation
   */
  protected readonly model = signal({ email: '' });

  /**
   * The email field, required (the browser checks its format, as in the Vue app)
   */
  protected readonly form = form(this.model, (model) => {
    required(model.email);
    disabled(model.email, { when: () => this.loading() });
  });

  /**
   * Asks for a reset link sent to the trimmed email; shows an error when it fails.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.requestPasswordReset(this.model().email.trim());
      this.sent.set(true);
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
