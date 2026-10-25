import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Number given to the title of the next dialog created, so each dialog labels itself with its own title
 */
let nextTitleNumber = 1;

/**
 * Popup asking to confirm an action (delete the account, remove a restaurant from a tierlist): a title, a message, the
 * fields projected inside (e.g. a password), an error, and Cancel / confirm buttons. A native dialog shown as a modal
 * once rendered (top layer, Esc key, focus kept inside); Cancel, Esc and a click outside ask to close it, except while
 * the action runs. The parent removes it once `closed` fires.
 */
@Component({
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  /**
   * Title of the popup, e.g. "Delete your account ?"
   */
  readonly heading = input.required<string>();

  /**
   * Text under the title, explaining what the action does; empty for none
   */
  readonly message = input('');

  /**
   * Label of the confirm button, e.g. "Delete"
   */
  readonly confirmLabel = input.required<string>();

  /**
   * Label of the confirm button while the action runs, e.g. "Deleting…"
   */
  readonly busyLabel = input.required<string>();

  /**
   * True while the action runs: the buttons are disabled, and the popup cannot be closed
   */
  readonly busy = input(false);

  /**
   * False while the action cannot be confirmed yet (e.g. no password typed): the confirm button is disabled
   */
  readonly canConfirm = input(true);

  /**
   * Why the last try failed, shown above the buttons; empty when there is none
   */
  readonly error = input('');

  /**
   * The user confirmed, from the confirm button or the Enter key: the parent runs the action
   */
  readonly confirmed = output<void>();

  /**
   * The popup asks to be closed (Cancel, Esc or a click outside), the action not run
   */
  readonly closed = output<void>();

  /**
   * The popup has just been shown as a modal: the parent can focus one of its fields
   */
  readonly opened = output<void>();

  /**
   * The native dialog, shown as a modal once rendered
   */
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Id of the title, labelling the dialog
   */
  protected readonly titleId = `confirm-dialog-title-${nextTitleNumber++}`;

  /**
   * True when the confirm button is disabled: the action cannot be confirmed yet, or already runs
   */
  protected readonly confirmDisabled = computed(() => !this.canConfirm() || this.busy());

  constructor() {
    afterNextRender({
      write: () => {
        this.dialog().nativeElement.showModal();
        this.opened.emit();
      },
    });
  }

  /**
   * Asks to close the popup, unless the action runs
   */
  protected cancel(): void {
    if (!this.busy()) this.closed.emit();
  }

  /**
   * Esc key: closes through the parent instead of the browser, so the popup stays open while the action runs
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
   * Confirms, unless the action cannot be confirmed yet or already runs
   */
  protected confirm(event: Event): void {
    event.preventDefault();
    if (!this.confirmDisabled()) this.confirmed.emit();
  }
}
