import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { AuthStore } from '@/core/auth/auth-store';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog';

/**
 * Popup asking for the password before deleting the account of the logged-in user. Shown by the settings page.
 */
@Component({
  imports: [ConfirmDialog, FormField],
  selector: 'app-delete-account-modal',
  styleUrl: './delete-account-modal.scss',
  templateUrl: './delete-account-modal.html',
})
export class DeleteAccountModal {
  /**
   * The popup asks to be closed (Cancel, Esc or a click outside), the account not deleted
   */
  readonly closed = output<void>();

  /**
   * Deletes the account, then opens the login page
   */
  private readonly auth = inject(AuthStore);

  /**
   * Password field, focused when the popup opens
   */
  private readonly passwordInput =
    viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  /**
   * True while the deletion request runs: the field and the buttons are disabled
   */
  protected readonly loading = signal(false);

  /**
   * Message of the last failed deletion, empty when there is none
   */
  protected readonly error = signal('');

  /**
   * Password as typed
   */
  private readonly confirmation = signal({ password: '' });

  /**
   * Password field, required, disabled while the deletion runs
   */
  protected readonly form = form(this.confirmation, (confirmation) => {
    required(confirmation.password);
    disabled(confirmation.password, { when: () => this.loading() });
  });

  /**
   * True when a password is entered and no deletion runs
   */
  protected readonly canConfirm = computed(
    () => this.confirmation().password !== '' && !this.loading(),
  );

  /**
   * Focuses the password once the popup is shown
   */
  protected focusPassword(): void {
    this.passwordInput().nativeElement.focus();
  }

  /**
   * Delete the account; on success AuthStore opens the login page, which removes this popup
   */
  protected async confirm(): Promise<void> {
    if (!this.canConfirm()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.deleteAccount(this.confirmation().password);
    } catch (e) {
      // 403: the API refused the password, the user stays logged in and can try again
      this.error.set(
        e instanceof HttpErrorResponse && e.status === 403
          ? 'Incorrect password.'
          : 'Your account could not be deleted. Please try again later.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
