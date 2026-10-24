import { Component, computed, inject, input } from '@angular/core';
import { NewReviewStore } from '@/core/review/new-review-store';
import { NewChip } from '../new-chip/new-chip';

/**
 * "+ New" chip starting a review: a link to the rating page of the given restaurant, or a button opening the new
 * review sheet to pick any restaurant.
 */
@Component({
  imports: [NewChip],
  selector: 'app-new-review-chip',
  template: `<app-new-chip [link]="reviewLink()" (pressed)="newReview.open()" />`,
})
export class NewReviewChip {
  /**
   * Restaurant to review directly; undefined to let the user pick it in the new review sheet
   */
  readonly restaurantId = input<string>();

  /**
   * Opens the new review sheet when there is no restaurantId
   */
  protected readonly newReview = inject(NewReviewStore);

  /**
   * Route of the rating page of restaurantId (/review/:id); undefined when there is none, for the sheet button
   */
  protected readonly reviewLink = computed(() => {
    const restaurantId = this.restaurantId();
    return restaurantId ? `/review/${restaurantId}` : undefined;
  });
}
