import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, max, min } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { RestaurantApi } from '@/core/api/restaurant-api';
import type { RatingInput, UserRating } from '@/core/models/rating.model';
import { CriterionSlider, type ReviewMarker } from '../criterion-slider/criterion-slider';
import { type PastReview, pickMarkers } from '../rating-scale';

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
 * Message shown when saving the rating failed, depending on the API answer. A 401 never gets here: the unauthorized
 * interceptor already logs out and leaves the page.
 */
function saveErrorMessage(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  if (status === 409) return 'You already rated this restaurant today.';
  return 'Could not save your rating, try again.';
}

/**
 * Rating page of a restaurant (/review/:id): a slider per criterion (food, service, decor), the "Instant Crush"
 * favorite bonus, and the button saving the rating.
 */
@Component({
  imports: [CriterionSlider, RouterLink],
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
   * Opens the restaurant page once saved, or the home page for an unknown restaurant
   */
  private readonly router = inject(Router);

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
   * The restaurant rated; undefined while loading, when it does not exist and when the API fails
   */
  protected readonly restaurant = computed(() =>
    this.restaurantResource.hasValue() ? this.restaurantResource.value() : undefined,
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
   * Save the rating, then go back to the restaurant page
   */
  protected async submit(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(this.ratingApi.rateRestaurant(restaurant.id, this.rating()));
      void this.router.navigateByUrl(`/restaurant/${restaurant.id}`);
    } catch (error) {
      this.saveError.set(saveErrorMessage(error));
    } finally {
      this.saving.set(false);
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
