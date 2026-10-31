import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type {
  FollowedRating,
  RatingAllowance,
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
   * @throws the HttpErrorResponse: 401 when not logged in, 404 for an unknown restaurant, 409 when the user already
   * rated a restaurant today
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
   * Get the most recent active ratings of a restaurant (each user's latest) given by the users the logged-in user
   * follows, most recent first
   * @param limit number of ratings, 1 to 50
   * @returns an empty list when the user is not logged in (401)
   */
  fetchRecentFollowedRatings(restaurantId: string, limit = 5): Observable<RestaurantRating[]> {
    return this.http
      .get<RestaurantRating[]>(
        `/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/followed`,
        { params: { limit } },
      )
      .pipe(recoverOnStatus(401, []));
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
   * Delete one rating the logged-in user gave to a restaurant. When it was their active rating, their previous one
   * becomes active again; when it was their only one, the restaurant leaves their tierlists
   * @param date moment of the rating, exactly as the API returned it (`RestaurantRating.date`)
   * @returns the ratings the user has left for the restaurant, most recent first
   * @throws the HttpErrorResponse: 401 when not logged in, 404 for an unknown restaurant or rating
   */
  deleteMyRating(restaurantId: string, date: string): Observable<RestaurantRating[]> {
    return this.http.delete<RestaurantRating[]>(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/mine/${encodeURIComponent(date)}`,
    );
  }

  /**
   * Delete every rating the logged-in user gave to a restaurant; the restaurant leaves their tierlists
   * @returns the ratings the user has left for the restaurant: none
   * @throws the HttpErrorResponse: 401 when not logged in, 404 for an unknown restaurant
   */
  deleteMyRatings(restaurantId: string): Observable<RestaurantRating[]> {
    return this.http.delete<RestaurantRating[]>(
      `/api/restaurants/${encodeURIComponent(restaurantId)}/ratings/mine`,
    );
  }

  /**
   * Get whether the logged-in user can rate a restaurant now: a user rates at most one restaurant per day (UTC)
   */
  fetchRatingAllowance(): Observable<RatingAllowance> {
    return this.http.get<RatingAllowance>(`/api/users/${ME}/rating-allowance`);
  }

  /**
   * Get every rating of a user (the logged-in user by default), with its restaurant, most recent first
   */
  fetchUserRatings(userId: string = ME): Observable<UserRating[]> {
    return this.http.get<UserRating[]>(`/api/users/${encodeURIComponent(userId)}/ratings`);
  }

  /**
   * Get the most recent ratings of the users the logged-in user follows, previous ratings included, with their
   * restaurant and their author, most recent first
   * @param limit number of ratings, 1 to 50
   */
  fetchFollowedRatings(limit = 5): Observable<FollowedRating[]> {
    return this.http.get<FollowedRating[]>(`/api/users/${ME}/following/ratings`, {
      params: { limit },
    });
  }
}
