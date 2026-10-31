import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { RestaurantRating } from '@/core/models/rating.model';
import { DailyReviewStore } from '@/core/review/daily-review-store';
import { WebShare } from '@/core/share/web-share';
import { ToastStore } from '@/core/toast/toast-store';
import { formatRatingDate, formatScore, ratingAverage } from '@/core/utils/rating';
import type { Action } from '@/shared/ui/actions/actions';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog';
import { NewReviewChip } from '@/shared/ui/new-review-chip/new-review-chip';
import { RatingCard } from '../rating-card/rating-card';

/**
 * Tab of the ratings: the logged-in user's, the recent ones of every user, or the recent ones of the users followed.
 */
type RatingsTab = 'mine' | 'recent' | 'followed';

/**
 * Shown in each tab when it has no rating.
 */
const EMPTY_MESSAGES: Record<RatingsTab, string> = {
  mine: 'No visits yet 🍽️',
  recent: 'No recent visits 🍽️',
  followed: 'Nobody you follow ate here yet 🍽️',
};

/**
 * Ratings of a restaurant in three tabs: the logged-in user's ("My Visits", shown first), the most recent of every user
 * ("Recent") and the most recent of the users followed ("Followed"), with the "+ New" button rating the restaurant.
 * Each rating of the logged-in user has a menu of actions: share it, delete it, or delete all their ratings of the
 * restaurant, the deletions after confirming.
 */
@Component({
  imports: [ConfirmDialog, NewReviewChip, RatingCard],
  selector: 'app-restaurant-ratings-tabs',
  styleUrl: './restaurant-ratings-tabs.scss',
  templateUrl: './restaurant-ratings-tabs.html',
})
export class RestaurantRatingsTabs {
  /**
   * Database id of the restaurant, rated by the "+ New" button
   */
  readonly restaurantId = input.required<string>();

  /**
   * Name of the restaurant, in the text shared and the confirmation of a deletion
   */
  readonly restaurantName = input.required<string>();

  /**
   * Every rating the logged-in user gave to the restaurant, most recent first
   */
  readonly myRatings = input.required<readonly RestaurantRating[]>();

  /**
   * Most recent active ratings of the restaurant, every user included, most recent first
   */
  readonly recentRatings = input.required<readonly RestaurantRating[]>();

  /**
   * Most recent active ratings of the restaurant by the users the logged-in user follows, most recent first
   */
  readonly followedRatings = input.required<readonly RestaurantRating[]>();

  /**
   * True while the ratings load: shown instead of an empty list
   */
  readonly loading = input.required<boolean>();

  /**
   * True when the ratings could not be loaded
   */
  readonly loadError = input.required<boolean>();

  /**
   * Emitted once ratings of the logged-in user are deleted: the page loads the ratings and averages again
   */
  readonly ratingsDeleted = output<void>();

  /**
   * Deletes the ratings of the logged-in user
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Shares the page of the restaurant through the native share sheet, or copies its link
   */
  private readonly webShare = inject(WebShare);

  /**
   * Confirms a deletion or a copied link, and tells when the link cannot be copied
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Checked again once a rating is deleted: deleting the rating of today lets the user review a restaurant again
   */
  private readonly dailyReview = inject(DailyReviewStore);

  /**
   * Tab shown
   */
  protected readonly activeTab = signal<RatingsTab>('mine');

  /**
   * Ratings of the tab shown
   */
  protected readonly ratings = computed(() => {
    switch (this.activeTab()) {
      case 'mine':
        return this.myRatings();
      case 'recent':
        return this.recentRatings();
      case 'followed':
        return this.followedRatings();
    }
  });

  /**
   * Id of the logged-in user, which tells their own ratings apart (they open /profile and have actions); null when
   * logged out
   */
  protected readonly myUserId = inject(AuthStore).loggedInUserId;

  /**
   * Cards of the tab shown: each rating, whether the logged-in user gave it, and the actions of its menu (none for the
   * other users' ratings)
   */
  protected readonly cards = computed(() =>
    this.ratings().map((rating) => {
      const own = rating.userId === this.myUserId();
      return { rating, own, actions: own ? this.actionsOf(rating) : [] };
    }),
  );

  /**
   * Shown when the tab has no rating
   */
  protected readonly emptyMessage = computed(() => EMPTY_MESSAGES[this.activeTab()]);

  /**
   * Deletion the user asked for, shown in the confirmation popup: one of their ratings, or 'all' of them; null while
   * the popup is closed
   */
  protected readonly pendingDeletion = signal<RestaurantRating | 'all' | null>(null);

  /**
   * Title of the confirmation popup
   */
  protected readonly deletionHeading = computed(() =>
    this.pendingDeletion() === 'all' ? 'Delete all your ratings?' : 'Delete this rating?',
  );

  /**
   * Text of the confirmation popup: what is deleted, and what becomes of the user's score and tierlists; empty while
   * it is closed
   */
  protected readonly deletionMessage = computed(() => {
    const pending = this.pendingDeletion();
    const name = this.restaurantName();
    if (pending === null) return '';
    if (pending === 'all') {
      const count = this.myRatings().length;
      const deleted = count === 1 ? 'Your rating' : `Your ${count} ratings`;
      return `${deleted} of ${name} will be deleted. It will also be removed from your tierlists.`;
    }
    const deleted = `Your rating of ${formatRatingDate(pending.date)} will be deleted.`;
    // The user's other ratings, most recent first: the first one becomes active when the active one is deleted
    const others = this.myRatings().filter((r) => r.date !== pending.date);
    if (!others.length) {
      return `${deleted} You will have no rating of ${name} left: it will also be removed from your tierlists.`;
    }
    return pending.isActive
      ? `${deleted} Your previous one, of ${formatRatingDate(others[0]!.date)}, becomes your score again.`
      : `${deleted} Your current score does not change.`;
  });

  /**
   * True while the deletion is being saved: the confirmation popup cannot be closed
   */
  protected readonly deleting = signal(false);

  /**
   * Why the last deletion failed, shown in the confirmation popup; empty when it did not
   */
  protected readonly deleteError = signal('');

  /**
   * Identifies a rating in the list: a user rates a restaurant at most once per day
   */
  protected ratingKey(rating: RestaurantRating): string {
    return `${rating.userId}-${rating.date}`;
  }

  /**
   * Actions of the menu of `rating`, one of the logged-in user's: share it (when the browser can share or copy a link),
   * delete it, and delete all their ratings of the restaurant when they have several; the deletions last
   */
  private actionsOf(rating: RestaurantRating): Action[] {
    const actions: Action[] = [];
    if (this.webShare.supported || this.webShare.canCopy) {
      actions.push({
        label: this.webShare.supported ? 'Share' : 'Copy link',
        icon: '📤',
        run: () => void this.share(rating),
      });
    }
    actions.push({
      label: 'Delete this rating',
      icon: '🗑️',
      danger: true,
      run: () => this.askDeletion(rating),
    });
    // With a single rating, "Delete this rating" already deletes them all
    if (this.myRatings().length > 1) {
      actions.push({
        label: 'Delete all ratings',
        icon: '🗑️',
        danger: true,
        run: () => this.askDeletion('all'),
      });
    }
    return actions;
  }

  /**
   * Sends the link of the restaurant page with the score of `rating` through the native share sheet, as the "Bravo"
   * modal does; copies the link when the browser has no share sheet, a toast telling whether it was copied
   */
  private async share(rating: RestaurantRating): Promise<void> {
    const name = this.restaurantName();
    const url = this.webShare.appUrl(`/restaurant/${this.restaurantId()}`);
    if (this.webShare.supported) {
      await this.webShare.share({
        title: name,
        text: `I gave ${name} ${formatScore(ratingAverage(rating))}/10 on FoodRank, have a look!`,
        url,
      });
    } else if (await this.webShare.copy(url)) {
      this.toasts.show('Link copied! Paste it to your friends.', 'success');
    } else {
      this.toasts.show("Couldn't copy the link.");
    }
  }

  /**
   * Asks the user to confirm the deletion of one of their ratings, or of 'all' of them
   */
  private askDeletion(target: RestaurantRating | 'all'): void {
    this.deleteError.set('');
    this.pendingDeletion.set(target);
  }

  /**
   * Closes the confirmation popup, the ratings kept
   */
  protected cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  /**
   * Deletes the rating(s) confirmed through the API, then closes the popup, confirms it in a toast and has the page
   * load the ratings again; on failure, the popup stays open and says it
   */
  protected async confirmDeletion(): Promise<void> {
    const pending = this.pendingDeletion();
    if (pending === null || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await firstValueFrom(
        pending === 'all'
          ? this.ratingApi.deleteMyRatings(this.restaurantId())
          : this.ratingApi.deleteMyRating(this.restaurantId(), pending.date),
      );
      this.pendingDeletion.set(null);
      this.toasts.show(pending === 'all' ? 'Ratings deleted' : 'Rating deleted', 'success');
      this.dailyReview.refresh();
      this.ratingsDeleted.emit();
    } catch {
      this.deleteError.set(
        pending === 'all'
          ? "Couldn't delete your ratings, try again."
          : "Couldn't delete the rating, try again.",
      );
    } finally {
      this.deleting.set(false);
    }
  }
}
