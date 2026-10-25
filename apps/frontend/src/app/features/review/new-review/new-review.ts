import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, max, min } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, tap } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { CelebrationStore } from '@/core/celebration/celebration-store';
import type { RatingInput, UserRating } from '@/core/models/rating.model';
import type { Restaurant } from '@/core/models/restaurant.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { DailyReviewStore, REVIEW_LOCKED_REASON } from '@/core/review/daily-review-store';
import { ToastStore } from '@/core/toast/toast-store';
import { byLastUpdate, containsRestaurant } from '@/core/utils/tierlist';
import { LockIcon } from '@/shared/ui/lock-icon/lock-icon';
import { CriterionSlider, type ReviewMarker } from '../criterion-slider/criterion-slider';
import { type PastReview, pickMarkers } from '../rating-scale';
import { TierlistChips } from '../tierlist-chips/tierlist-chips';
import { TierlistSelectDialog } from '../tierlist-select-dialog/tierlist-select-dialog';

/**
 * A past review of the user, with the restaurant it rates.
 */
interface ReviewedRestaurant extends PastReview {
  /**
   * Emoji of the restaurant reviewed
   */
  emoji: string;

  /**
   * Name of the restaurant reviewed
   */
  name: string;
}

/**
 * The user's score of each other restaurant they rated (their active rating), as past reviews; the API's setting is
 * the decor of the sliders
 * @param ratedId restaurant being rated, left out: only the other restaurants are landmarks
 */
function pastReviews(ratings: readonly UserRating[], ratedId: string): ReviewedRestaurant[] {
  return ratings
    .filter((rating) => rating.isActive && rating.restaurantId !== ratedId)
    .map((rating) => ({
      id: rating.restaurantId,
      food: rating.food,
      service: rating.service,
      decor: rating.setting,
      emoji: rating.restaurantEmoji,
      name: rating.restaurantName,
    }));
}

/**
 * True when the API refused the rating because the user already rated a restaurant today (409)
 */
function isAlreadyRatedToday(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * True when the API refused to add the restaurant to a tierlist because it is already in it (409): nothing to report
 */
function isAlreadyInTierlist(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * Message shown when saving the rating failed, depending on the API answer. A 401 never gets here: the unauthorized
 * interceptor already logs out and leaves the page.
 */
function saveErrorMessage(error: unknown): string {
  if (isAlreadyRatedToday(error)) return 'You already reviewed a restaurant today.';
  return 'Could not save your rating, try again.';
}

/**
 * Rating page of a restaurant (/review/:id): a slider per criterion (food, service, decor), the "Instant Crush"
 * favorite bonus, the tierlists to add the restaurant to (chips, and a popup to search them), and the button saving
 * the rating, locked once the user reviewed a restaurant today.
 */
@Component({
  imports: [CriterionSlider, LockIcon, RouterLink, TierlistChips, TierlistSelectDialog],
  selector: 'app-new-review',
  styleUrl: './new-review.scss',
  templateUrl: './new-review.html',
})
export class NewReview {
  /**
   * Database id of the restaurant rated, from /review/:id
   */
  readonly id = input.required<string>();

  /**
   * Reads the restaurant rated
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Reads the user's past reviews and saves the rating
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Reads the user's tierlists, and adds the restaurant to the selected ones once rated
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Tells which tierlists the restaurant could not be added to
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Opens the restaurant page once saved, or the home page for an unknown restaurant
   */
  private readonly router = inject(Router);

  /**
   * Tells the restaurant page to congratulate the user after their first rating of the restaurant
   */
  private readonly celebrations = inject(CelebrationStore);

  /**
   * The "one review per day" rule: locks the page once the user reviewed a restaurant today, and is told about each
   * review saved or refused
   */
  private readonly dailyReview = inject(DailyReviewStore);

  /**
   * True once the user reviewed a restaurant today: the rating cannot be saved, the page says why
   */
  protected readonly locked = this.dailyReview.locked;

  /**
   * Why the page is locked
   */
  protected readonly lockedReason = REVIEW_LOCKED_REASON;

  /**
   * The restaurant rated; leaves for the home page when it does not exist
   */
  private readonly restaurantResource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) =>
      this.restaurantApi.fetchRestaurantById(id).pipe(
        tap((restaurant) => {
          if (!restaurant) void this.router.navigateByUrl('/', { replaceUrl: true });
        }),
      ),
  });

  /**
   * Every rating of the logged-in user, loaded apart from the restaurant: the page still works without them
   */
  private readonly ratingsResource = rxResource({
    stream: () => this.ratingApi.fetchUserRatings(),
  });

  /**
   * The user's tierlists, the most recently updated first, loaded apart from the restaurant: the page still works
   * without them
   */
  private readonly tierlistsResource = rxResource({
    stream: () => this.tierlistApi.fetchTierlistsByUserId().pipe(map(byLastUpdate)),
  });

  /**
   * True while the restaurant loads
   */
  protected readonly loading = this.restaurantResource.isLoading;

  /**
   * True when the restaurant could not be loaded: the page cannot be used, only left
   */
  protected readonly loadError = computed(() => this.restaurantResource.status() === 'error');

  /**
   * True when the user's ratings could not be loaded: the sliders work, without the past reviews
   */
  protected readonly pastReviewsError = computed(() => this.ratingsResource.status() === 'error');

  /**
   * True when the user's tierlists could not be loaded: the rating can be saved, without adding the restaurant to them
   */
  protected readonly tierlistsError = computed(() => this.tierlistsResource.status() === 'error');

  /**
   * The user's tierlists offered as chips, the most recently updated first; empty while loading and when the API
   * fails
   */
  protected readonly myTierlists = computed(() =>
    this.tierlistsResource.hasValue() ? this.tierlistsResource.value() : [],
  );

  /**
   * Ids of the tierlists the restaurant is added to once the rating is saved, chosen with the chips or the popup
   */
  protected readonly selectedTierlistIds = signal<number[]>([]);

  /**
   * The selected tierlists not holding the restaurant yet (a new review of it): it is added to them once the rating
   * is saved, the others are not sent again
   */
  private readonly tierlistsToAdd = computed(() =>
    this.myTierlists().filter(
      (t) => this.selectedTierlistIds().includes(t.id) && !containsRestaurant(t, this.id()),
    ),
  );

  /**
   * True while the popup searching the tierlists is open
   */
  protected readonly tierlistDialogOpen = signal(false);

  /**
   * The restaurant rated; undefined while loading, when it does not exist and when the API fails
   */
  protected readonly restaurant = computed(() =>
    this.restaurantResource.hasValue() ? this.restaurantResource.value() : undefined,
  );

  /**
   * True when the user never rated this restaurant before, whoever else did: saving then congratulates them. False
   * while their ratings load and when the API fails
   */
  private readonly firstRating = computed(
    () =>
      this.ratingsResource.hasValue() &&
      this.ratingsResource.value().every((rating) => rating.restaurantId !== this.id()),
  );

  /**
   * Past reviews of the user, one per other restaurant they rated; empty until loaded and when the API fails
   */
  private readonly userReviews = computed(() =>
    this.ratingsResource.hasValue() ? pastReviews(this.ratingsResource.value(), this.id()) : [],
  );

  /**
   * Past reviews shown under the food slider
   */
  protected readonly foodMarkers = computed(() => this.markers('food'));

  /**
   * Past reviews shown under the service slider
   */
  protected readonly serviceMarkers = computed(() => this.markers('service'));

  /**
   * Past reviews shown under the decor slider
   */
  protected readonly decorMarkers = computed(() => this.markers('decor'));

  /**
   * Scores (0 to 100, 50 to start with) and favorite bonus being given
   */
  private readonly rating = signal<RatingInput>({
    food: 50,
    service: 50,
    setting: 50,
    bonus: false,
  });

  /**
   * Rating fields: the three sliders, from 0 to 100
   */
  protected readonly ratingForm = form(this.rating, (rating) => {
    for (const score of [rating.food, rating.service, rating.setting]) {
      min(score, 0);
      max(score, 100);
    }
  });

  /**
   * True while the rating is being saved: the button is disabled, so it is not sent twice
   */
  protected readonly saving = signal(false);

  /**
   * Why saving failed; null when it did not
   */
  protected readonly saveError = signal<string | null>(null);

  /**
   * Instant Crush: the favorite bonus, given or not
   */
  protected readonly instantCrush = computed(() => this.rating().bonus);

  /**
   * Gives or removes the favorite bonus
   */
  protected toggleCrush(): void {
    this.rating.update((rating) => ({ ...rating, bonus: !rating.bonus }));
  }

  /**
   * Save the rating, add the restaurant to the selected tierlists, then go back to the restaurant page, which
   * congratulates the user after their first rating of it. The review buttons of the app lock once it is saved, or
   * when the API says the user already reviewed today
   */
  protected async submit(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant || this.saving() || this.locked()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(this.ratingApi.rateRestaurant(restaurant.id, this.rating()));
      const tierlists = this.tierlistsToAdd();
      if (tierlists.length) await this.addToTierlists(restaurant, tierlists);
      this.dailyReview.refresh();
      if (this.firstRating()) this.celebrations.celebrate(restaurant.id, 'first-review');
      void this.router.navigateByUrl(`/restaurant/${restaurant.id}`);
    } catch (error) {
      this.saveError.set(saveErrorMessage(error));
      if (isAlreadyRatedToday(error)) this.dailyReview.refresh();
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Adds the restaurant just rated (the API only adds rated restaurants) to `tierlists`, all at once. Never fails: the
   * rating is saved whatever happens, and one toast names the tierlists it could not be added to. A 409 means it is
   * already in the tierlist: nothing to report
   */
  private async addToTierlists(restaurant: Restaurant, tierlists: Tierlist[]): Promise<void> {
    const results = await Promise.allSettled(
      tierlists.map((t) =>
        firstValueFrom(this.tierlistApi.addRestaurantToTierlist(t.id, restaurant.id)),
      ),
    );
    const failed = tierlists.filter((_, i) => {
      const result = results[i]!;
      return result.status === 'rejected' && !isAlreadyInTierlist(result.reason);
    });
    if (failed.length) {
      this.toasts.show(
        `Couldn't add ${restaurant.name} to ${failed.map((t) => t.name).join(', ')}.`,
      );
    }
  }

  /**
   * Past reviews shown under the slider of a criterion
   */
  private markers(key: 'food' | 'service' | 'decor'): ReviewMarker[] {
    return pickMarkers(this.userReviews(), key).map((review) => ({
      id: review.id,
      value: review[key],
      emoji: review.emoji,
      name: review.name,
    }));
  }
}
