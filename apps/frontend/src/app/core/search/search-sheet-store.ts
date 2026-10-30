import { Service, signal } from '@angular/core';

/**
 * Whether the search sheet is open, shared by the buttons that open it (the Search button of the tab bar, the "+ New"
 * chips) and the sheet itself. The sheet searches restaurants (e.g. to pick the one to review) and users.
 */
@Service()
export class SearchSheetStore {
  /**
   * Writable state behind isOpen
   */
  private readonly opened = signal(false);

  /**
   * True while the search sheet is shown
   */
  readonly isOpen = this.opened.asReadonly();

  /**
   * Shows the search sheet
   */
  open(): void {
    this.opened.set(true);
  }

  /**
   * Hides the search sheet
   */
  close(): void {
    this.opened.set(false);
  }
}
