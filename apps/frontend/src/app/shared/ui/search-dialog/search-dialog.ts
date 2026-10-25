import {
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ToastOutlet } from '../toast-outlet/toast-outlet';

/**
 * Number given to the title of the next dialog created, so each dialog labels itself with its own title
 */
let nextTitleNumber = 1;

/**
 * Popup listing items to pick, with a search field filtering them: a title, a close (×) button, the search field,
 * optional filters under it (`[searchDialogFilters]`, e.g. sort chips), the list projected inside and an optional footer
 * (`[searchDialogFooter]`). A card centered on the screen, or covering it with `fullScreen`. A native dialog shown as a
 * modal once rendered, the search field focused; the × button, the Esc key and a click outside the card ask to close
 * it, the parent removing it. Toasts shown while it is open render inside it.
 */
@Component({
  imports: [FormField, ToastOutlet],
  selector: 'app-search-dialog',
  styleUrl: './search-dialog.scss',
  templateUrl: './search-dialog.html',
})
export class SearchDialog {
  /**
   * Title of the popup, e.g. "Add to a tierlist"
   */
  readonly heading = input.required<string>();

  /**
   * Placeholder and accessible name of the search field, e.g. "Search your tierlists"
   */
  readonly searchLabel = input.required<string>();

  /**
   * True to cover the whole screen instead of showing a card, for long lists (e.g. every restaurant rated)
   */
  readonly fullScreen = input(false, { transform: booleanAttribute });

  /**
   * Text typed in the search field, as typed; the parent filters its list with it
   */
  readonly query = model('');

  /**
   * The popup asks to be closed (× button, Esc or a click outside)
   */
  readonly closed = output<void>();

  /**
   * Search field, with no validation
   */
  protected readonly searchForm = form(this.query);

  /**
   * The native dialog, shown as a modal once rendered
   */
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Search field, focused when the popup opens
   */
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Id of the title, labelling the dialog
   */
  protected readonly titleId = `search-dialog-title-${nextTitleNumber++}`;

  constructor() {
    afterNextRender({
      write: () => {
        this.dialog().nativeElement.showModal();
        this.searchInput().nativeElement.focus();
      },
    });
  }

  /**
   * Esc key: closes through the parent instead of the browser, which removes the popup
   */
  protected closeOnEscape(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  /**
   * Closes the popup on a click on the dark overlay around it, not inside it
   */
  protected closeOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
