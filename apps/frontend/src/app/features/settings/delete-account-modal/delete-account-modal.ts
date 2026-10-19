import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { AuthStore } from '@/core/auth/auth-store';

/**
 * Popup asking for the password before deleting the account of the logged-in user. Shown by the settings page.
 */
@Component({
  imports: [FormField],
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
   * The native dialog, shown as a modal once rendered
   */
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

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

  constructor() {
    // Shows the dialog as a modal (top layer, Esc key, focus kept inside) once rendered, then focuses the password
    afterNextRender({
      write: () => {
        this.dialog().nativeElement.showModal();
        this.passwordInput().nativeElement.focus();
      },
    });
  }

  /**
   * Asks to close the popup, unless the deletion runs
   */
  protected cancel(): void {
    if (!this.loading()) this.closed.emit();
  }

  /**
   * Esc key: closes through the parent instead of the browser, so the popup stays open while the deletion runs
   */
  protected cancelOnEscape(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  /**
   * Closes the popup on a click on the dark overlay around it, not inside it
   */
  protected cancelOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel();
  }

  /**
   * Delete the account; on success AuthStore opens the login page, which removes this popup
   */
  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();
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
