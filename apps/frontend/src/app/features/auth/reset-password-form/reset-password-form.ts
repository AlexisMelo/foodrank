import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';

/**
 * New password form of the reset password page. The reset link (sent by email) carries its tokens in the URL
 * fragment: #access_token=...&refresh_token=...&type=recovery.
 */
@Component({
  imports: [FormField],
  selector: 'app-reset-password-form',
  styleUrl: './reset-password-form.scss',
  templateUrl: './reset-password-form.html',
})
export class ResetPasswordForm implements OnInit {
  /** Sets the new password, then checks the session it opens */
  private readonly auth = inject(AuthStore);
  /** Removes the tokens from the URL, then opens the home page */
  protected readonly router = inject(Router);
  /** Page route, whose fragment holds the tokens of the link */
  private readonly route = inject(ActivatedRoute);

  /** access_token of the link, empty until read */
  private accessToken = '';
  /** refresh_token of the link, empty until read */
  private refreshToken = '';

  /** True when the link has no tokens or is not a recovery link: the form is replaced by an explanation */
  protected readonly invalidLink = signal(false);
  /** True while the request runs: the field and the button are disabled */
  protected readonly loading = signal(false);
  /** Message of the last failed reset, empty when there is none */
  protected readonly error = signal('');

  /** New password as typed */
  private readonly model = signal({ password: '' });
  /** The new password field, required */
  protected readonly form = form(this.model, (model) => {
    required(model.password);
    disabled(model.password, { when: () => this.loading() });
  });

  /** Reads the tokens of the link, then removes them from the URL. */
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

  /** Sets the new password, then opens the home page with the session it opened; explains the failure otherwise. */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
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
    } catch {
      this.error.set('Could not reset password. The link may have expired.');
    } finally {
      this.loading.set(false);
    }
  }
}
