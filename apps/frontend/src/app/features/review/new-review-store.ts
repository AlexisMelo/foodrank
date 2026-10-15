import { Service, signal } from '@angular/core';

/** Whether the new review sheet is open, shared by the buttons that open it and the sheet itself. */
@Service()
export class NewReviewStore {
  /** Writable state behind isOpen */
  private readonly opened = signal(false);

  /** True while the new review sheet is shown */
  readonly isOpen = this.opened.asReadonly();

  /** Shows the new review sheet */
  open(): void {
    this.opened.set(true);
  }

  /** Hides the new review sheet */
  close(): void {
    this.opened.set(false);
  }
}
