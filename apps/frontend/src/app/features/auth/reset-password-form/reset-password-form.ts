import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, disabled, form, required, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';
import { isValidPassword } from '@/core/utils/signup';
import { PasswordCriteria } from '../signup/password-criteria/password-criteria';

/**
 * Message shown when the reset failed. The API answers 400 when the password breaks the rules or Supabase refuses it
 * (its `{ error }` then says why, e.g. the current password reused), 401 when the link is invalid or expired; any
 * other failure (server error, no network) is not the user's fault.
 */
function resetErrorMessage(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  if (status === 400) {
    const reason: unknown = (error as HttpErrorResponse).error?.error;
    return typeof reason === 'string'
      ? reason
      : 'The password must follow the rules above. Please choose another one.';
  }
  if (status === 401) return 'Could not reset password. The link may have expired.';
  return 'Something went wrong. Please try again.';
}

/**
 * New password form of the reset password page. The reset link (sent by email) carries its tokens in the URL
 * fragment: #access_token=...&refresh_token=...&type=recovery.
 */
@Component({
  imports: [FormField, PasswordCriteria],
  selector: 'app-reset-password-form',
  styleUrl: './reset-password-form.scss',
  templateUrl: './reset-password-form.html',
})
export class ResetPasswordForm implements OnInit {
  /**
   * Sets the new password, then checks the session it opens
   */
  private readonly auth = inject(AuthStore);

  /**
   * Removes the tokens from the URL, then opens the home page
   */
  protected readonly router = inject(Router);

  /**
   * Page route, whose fragment holds the tokens of the link
   */
  private readonly route = inject(ActivatedRoute);

  /**
   * access_token of the link, empty until read
   */
  private accessToken = '';

  /**
   * refresh_token of the link, empty until read
   */
  private refreshToken = '';

  /**
   * True when the link has no tokens or is not a recovery link: the form is replaced by an explanation
   */
  protected readonly invalidLink = signal(false);

  /**
   * True while the request runs: the field and the button are disabled
   */
  protected readonly loading = signal(false);

  /**
   * Message of the last failed reset, empty when there is none
   */
  protected readonly error = signal('');

  /**
   * New password as typed, also ticking the password criteria
   */
  protected readonly model = signal({ password: '' });

  /**
   * The new password field, valid once it follows every rule of passwordCriteria (the same rules as at sign up)
   */
  protected readonly form = form(this.model, (model) => {
    required(model.password);
    validate(model.password, ({ value }) =>
      isValidPassword(value()) ? undefined : { kind: 'password' },
    );
    disabled(model.password, { when: () => this.loading() });
  });

  /**
   * True once the password follows every rule: the button stays disabled until then
   */
  protected readonly canSubmit = computed(() => this.form.password().valid());

  /**
   * Reads the tokens of the link, then removes them from the URL.
   */
  ngOnInit(): void {
    const params = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const token = params.get('access_token');
    const refresh = params.get('refresh_token');

    if (!token || !refresh || params.get('type') !== 'recovery') {
      this.invalidLink.set(true);
      return;
    }

    this.accessToken = token;
    this.refreshToken = refresh;
    void this.router.navigate([], { relativeTo: this.route, replaceUrl: true });
  }

  /**
   * Sets the new password once it is valid, then opens the home page with the session it opened; explains the
   * failure otherwise.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.resetPassword({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        password: this.model().password,
      });
      await this.auth.checkSession();
      void this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      this.error.set(resetErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
