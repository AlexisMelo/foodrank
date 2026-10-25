import { DOCUMENT, Location } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CelebrationKind } from '@/core/celebration/celebration-store';
import type { Restaurant } from '@/core/models/restaurant.model';
import { DailyReviewStore, REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { WebShare } from '@/core/share/web-share';
import { LockIcon } from '@/shared/ui/lock-icon/lock-icon';
import { ToastOutlet } from '@/shared/ui/toast-outlet/toast-outlet';

/**
 * Full page modal of the restaurant page, celebrating the logged-in user (see CelebrationKind):
 * - "The explorer", when they are the first to open the place from the search: leads to its rating page (locked once
 *   they reviewed a restaurant today), or closes on the restaurant page
 * - "Bravo", right after their first rating of the restaurant: shares the restaurant page through the native share
 *   sheet, or copies its link when the browser has no share sheet
 *
 * Both close with their cross or the Esc key. Toasts shown while it is open render inside it (e.g. a tierlist the
 * rating page could not add the restaurant to).
 */
@Component({
  imports: [LockIcon, RouterLink, ToastOutlet],
  selector: 'app-celebration-dialog',
  styleUrl: './celebration-dialog.scss',
  templateUrl: './celebration-dialog.html',
})
export class CelebrationDialog {
  /**
   * What is celebrated
   */
  readonly kind = input.required<CelebrationKind>();

  /**
   * The restaurant celebrated
   */
  readonly restaurant = input.required<Restaurant>();

  /**
   * Emits once the modal is closed (cross, Esc key or "See the restaurant"): the page then removes it
   */
  readonly closed = output();

  /**
   * Opens the native share sheet, or copies the link
   */
  protected readonly webShare = inject(WebShare);

  /**
   * Locks "Leave a review" once the user reviewed a restaurant today
   */
  protected readonly dailyReview = inject(DailyReviewStore);

  /**
   * Tooltip of the locked "Leave a review"
   */
  protected readonly lockedReason = REVIEW_LOCKED_REASON;

  /**
   * Builds the URL of the restaurant page, with the base href of the app
   */
  private readonly location = inject(Location);

  /**
   * Gives the origin of the app (scheme, host and port), for the absolute URL shared
   */
  private readonly document = inject(DOCUMENT);

  /**
   * The native dialog, shown as a modal (top layer, Esc key, focus kept inside) once rendered
   */
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Result of the last "Copy link": shown under the button; null before any copy
   */
  protected readonly copyStatus = signal<'copied' | 'failed' | null>(null);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /**
   * Closes the modal, showing the restaurant page under it; its close event then tells the page
   */
  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /**
   * Opens the native share sheet with the restaurant page
   */
  protected share(): void {
    const restaurant = this.restaurant();
    void this.webShare.share({
      title: restaurant.name,
      text: `I just rated ${restaurant.name} on FoodRank, have a look!`,
      url: this.restaurantUrl(),
    });
  }

  /**
   * Copies the link of the restaurant page, for browsers without a share sheet
   */
  protected async copyLink(): Promise<void> {
    this.copyStatus.set((await this.webShare.copy(this.restaurantUrl())) ? 'copied' : 'failed');
  }

  /**
   * Absolute URL of the restaurant page, as other people open it
   */
  private restaurantUrl(): string {
    const path = this.location.prepareExternalUrl(`/restaurant/${this.restaurant().id}`);
    return new URL(path, this.document.location.origin).href;
  }
}
