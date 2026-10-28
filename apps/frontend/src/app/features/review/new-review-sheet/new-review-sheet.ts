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
import { UserLocation } from '@/core/location/user-location';
import { NewReviewStore } from '@/core/review/new-review-store';
import { SearchAreaHint } from '@/shared/ui/search-area-hint/search-area-hint';
import { SearchBar } from '@/shared/ui/search-bar/search-bar';

/**
 * Sheet sliding from the top to search restaurants and users: the search runs on Enter or the search button, and
 * opens the search results page, where the restaurant to review is picked. Opened by NewReviewStore, from the bottom
 * tab bar or the "+ New" chips.
 */
@Component({
  imports: [SearchAreaHint, SearchBar],
  selector: 'app-new-review-sheet',
  styleUrl: './new-review-sheet.scss',
  templateUrl: './new-review-sheet.html',
})
export class NewReviewSheet {
  /**
   * Whether the sheet is open, and closes it
   */
  protected readonly newReview = inject(NewReviewStore);

  /**
   * Position of the user, used by the results page to favor nearby restaurants; asked for each time the sheet opens,
   * so the location hint shows the city around which restaurants are searched
   */
  private readonly userLocation = inject(UserLocation);

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
    // Asks for the position each time the sheet opens, so the search favors nearby restaurants
    effect(() => {
      if (this.newReview.isOpen()) untracked(() => this.userLocation.requestLocation());
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
    this.newReview.close();
    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  /**
   * Esc key: closes through the store instead of the browser, so the sheet plays its closing animation
   */
  protected cancel(event: Event): void {
    event.preventDefault();
    this.newReview.close();
  }

  /**
   * Closes the sheet on a click on the dark overlay around it, not inside it
   */
  protected closeOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.newReview.close();
  }
}
