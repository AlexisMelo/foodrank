import { Component, computed, inject, input } from '@angular/core';
import { DailyReviewStore, REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { SearchSheetStore } from '@/core/search/search-sheet-store';
import { NewChip } from '../new-chip/new-chip';

/**
 * "+ New" chip starting a review: a link to the rating page of the given restaurant, or a button opening the search
 * sheet to pick any restaurant. Locked once the user reviewed a restaurant today.
 */
@Component({
  imports: [NewChip],
  selector: 'app-new-review-chip',
  template: `<app-new-chip
    [link]="reviewLink()"
    [locked]="dailyReview.locked()"
    [lockedReason]="lockedReason"
    (pressed)="searchSheet.open()"
  />`,
})
export class NewReviewChip {
  /**
   * Restaurant to review directly; undefined to let the user pick it in the search sheet
   */
  readonly restaurantId = input<string>();

  /**
   * Opens the search sheet when there is no restaurantId
   */
  protected readonly searchSheet = inject(SearchSheetStore);

  /**
   * Locks the chip once the user reviewed a restaurant today
   */
  protected readonly dailyReview = inject(DailyReviewStore);

  /**
   * Tooltip of the locked chip
   */
  protected readonly lockedReason = REVIEW_LOCKED_REASON;

  /**
   * Route of the rating page of restaurantId (/review/:id); undefined when there is none, for the sheet button
   */
  protected readonly reviewLink = computed(() => {
    const restaurantId = this.restaurantId();
    return restaurantId ? `/review/${restaurantId}` : undefined;
  });
}
