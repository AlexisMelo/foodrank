import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  RatingInput,
  RatingSummary,
  RestaurantRating,
  UserRating,
} from '@/core/models/rating.model';
import { recoverOnStatus } from './recover-on-status';
import { ME } from './user-api';

/**
 * Ratings of the API (/api/restaurants/:id/ratings, /api/users/:id/ratings).
 */
@Service()
export class RatingApi {
  /**
   * Sends the requests to the API
   */
  private readonly http = inject(HttpClient);

  /**
   * Save the logged-in user's rating of a restaurant for today
   * @throws the HttpErrorResponse: 401 when not logged in, 404 for an unknown restaurant, 409 when already rated today
   */
  rateRestaurant(restaurantId: string, rating: RatingInput): Observable<void> {
    return this.http
      .post(`/api/restaurants/${encodeURIComponent(restaurantId)}/ratings`, rating)
      .pipe(map(() => undefined));
  }

  /**
   * Get the most recent active ratings of a restaurant (each user's latest), every user included, most recent first
   * @param limit number of ratings, 1 to 50
   */
  fetchRecentRatings(restaurantId: string, limit = 5): Observable<RestaurantRating[]> {
    return this.http.get<RestaurantRating[]>(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/ratings`,
      { params: { limit } },
    );
  }

  /**
   * Get the averages of every active rating of a restaurant, per criterion and globally
   */
  fetchRatingSummary(restaurantId: string): Observable<RatingSummary> {
    return this.http.get<RatingSummary>(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/summary`,
    );
  }

  /**
   * Get every rating the logged-in user gave to a restaurant, most recent first
   * @returns an empty list when the user is not logged in (401)
   */
  fetchMyRatings(restaurantId: string): Observable<RestaurantRating[]> {
    return this.http
      .get<RestaurantRating[]>(`/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/mine`)
      .pipe(recoverOnStatus(401, []));
  }

  /**
   * Get every rating of a user (the logged-in user by default), with its restaurant, most recent first
   */
  fetchUserRatings(userId: string = ME): Observable<UserRating[]> {
    return this.http.get<UserRating[]>(`/api/users/${encodeURIComponent(userId)}/ratings`);
  }
}
