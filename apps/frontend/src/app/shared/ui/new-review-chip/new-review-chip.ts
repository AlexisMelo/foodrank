import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { NewReviewStore } from '@/core/review/new-review-store';
import { NewChip } from '../new-chip/new-chip';

/**
 * "+ New" button starting a review: of the given restaurant, or of any restaurant through the new review sheet.
 */
@Component({
  imports: [NewChip],
  selector: 'app-new-review-chip',
  template: `<app-new-chip (pressed)="handleClick()" />`,
})
export class NewReviewChip {
  /**
   * Restaurant to review directly; undefined to let the user pick it in the new review sheet
   */
  readonly restaurantId = input<string>();

  /**
   * Opens the rating page of restaurantId
   */
  private readonly router = inject(Router);

  /**
   * Opens the new review sheet when there is no restaurantId
   */
  private readonly newReview = inject(NewReviewStore);

  /**
   * Opens the rating page of the restaurant, or the new review sheet when there is none
   */
  protected handleClick(): void {
    const restaurantId = this.restaurantId();
    if (restaurantId) {
      void this.router.navigateByUrl(`/review/${restaurantId}`);
    } else {
      this.newReview.open();
    }
  }
}
