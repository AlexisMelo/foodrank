import {
  Component,
  ElementRef,
  afterRenderEffect,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { LocationStore } from '@/core/location/location-store';
import { SearchSheetStore } from '@/core/search/search-sheet-store';
import { SearchAreaHint } from '@/shared/ui/search-area-hint/search-area-hint';
import { SearchBar } from '@/shared/ui/search-bar/search-bar';

/**
 * Sheet sliding from the top to search restaurants and users: the search runs on Enter or the search button, and
 * opens the search results page, where the restaurant to review is picked. Opened by SearchSheetStore, from the bottom
 * tab bar or the "+ New" chips.
 */
@Component({
  imports: [SearchAreaHint, SearchBar],
  selector: 'app-search-sheet',
  styleUrl: './search-sheet.scss',
  templateUrl: './search-sheet.html',
})
export class SearchSheet {
  /**
   * Whether the sheet is open, and closes it
   */
  protected readonly searchSheet = inject(SearchSheetStore);

  /**
   * Position of the user, used by the results page to favor nearby restaurants; located when the app opens, then
   * refreshed each time the sheet opens, in case the user has moved
   */
  private readonly locationStore = inject(LocationStore);

  /**
   * Opens the search results page
   */
  private readonly router = inject(Router);

  /**
   * The native dialog, shown as a modal once rendered; undefined while the sheet is closed
   */
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Search field, focused when the sheet opens; undefined while the sheet is closed. It is created again empty on each
   * opening
   */
  private readonly searchBar = viewChild(SearchBar);

  constructor() {
    // Refreshes the position each time the sheet opens; the known one stays meanwhile, so a query typed fast is still
    // searched near the user
    effect(() => {
      if (this.searchSheet.isOpen()) untracked(() => this.locationStore.refreshLocation());
    });
    // Shows the dialog as a modal (top layer, Esc key, focus kept inside) once rendered, then focuses the search field
    afterRenderEffect({
      write: () => {
        const dialog = this.dialog()?.nativeElement;
        if (!dialog || dialog.open) return;
        dialog.showModal();
        this.searchBar()?.focus();
      },
    });
  }

  /**
   * Opens the search results of the query (already trimmed, never empty), then closes
   */
  protected search(query: string): void {
    this.searchSheet.close();
    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  /**
   * Esc key: closes through the store instead of the browser, so the sheet plays its closing animation
   */
  protected cancel(event: Event): void {
    event.preventDefault();
    this.searchSheet.close();
  }

  /**
   * Closes the sheet on a click on the dark overlay around it, not inside it
   */
  protected closeOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.searchSheet.close();
  }
}
