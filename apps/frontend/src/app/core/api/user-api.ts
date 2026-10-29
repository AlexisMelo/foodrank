import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { SearchPage } from '@/core/models/search.model';
import type { UserProfile, UserSummary } from '@/core/models/user.model';
import { recoverOnStatus } from './recover-on-status';

/**
 * Id standing for the logged-in user in /api/users/... urls.
 */
export const ME = 'me';

/**
 * Shortest query the user search answers, same as the API (UserRanking.MinQueryLength) and the shortest pseudonym;
 * shorter ones return no user.
 */
export const USER_SEARCH_MIN_LENGTH = 3;

/**
 * Most users the user search returns, same as the API (UserRanking.MaxResults): the highest limit it accepts.
 */
export const USER_SEARCH_MAX_RESULTS = 50;

/**
 * Users of the API (/api/users).
 */
@Service()
export class UserApi {
  /**
   * Sends the requests to the API
   */
  private readonly http = inject(HttpClient);

  /**
   * Get the profile of a user (the logged-in user by default)
   * @returns undefined when the user does not exist
   */
  fetchUserProfile(userId: string = ME): Observable<UserProfile | undefined> {
    return this.http
      .get<UserProfile>(`/api/users/${encodeURIComponent(userId)}`)
      .pipe(recoverOnStatus(404, undefined));
  }

  /**
   * Get the first users whose pseudonym contains the query, ignoring case, best matches first (same pseudonym, then
   * starting with the query), never the logged-in user. Asking again with a bigger limit returns the same first users
   * followed by the next ones ("Show more")
   * @param limit maximum number of users, 1 to USER_SEARCH_MAX_RESULTS
   */
  searchUsers(query: string, limit: number): Observable<SearchPage<UserSummary>> {
    return this.http.get<SearchPage<UserSummary>>('/api/users/search', {
      params: { query, limit },
    });
  }

  /**
   * Get the users following a user, the most recent follow first
   * @param userId real id of the user ("me" is not accepted by this endpoint)
   */
  fetchFollowers(userId: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`/api/users/${encodeURIComponent(userId)}/followers`);
  }

  /**
   * Get the users a user follows, the most recent follow first
   * @param userId real id of the user ("me" is not accepted by this endpoint)
   */
  fetchFollowing(userId: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`/api/users/${encodeURIComponent(userId)}/following`);
  }

  /**
   * Make the logged-in user follow a user; following a user already followed changes nothing
   * @returns the followers of the user, the logged-in user among them
   */
  follow(userId: string): Observable<UserSummary[]> {
    return this.http.put<UserSummary[]>(`/api/users/${encodeURIComponent(userId)}/follow`, null);
  }

  /**
   * Make the logged-in user stop following a user; unfollowing a user not followed changes nothing
   * @returns the followers of the user, without the logged-in user
   */
  unfollow(userId: string): Observable<UserSummary[]> {
    return this.http.delete<UserSummary[]>(`/api/users/${encodeURIComponent(userId)}/follow`);
  }
}
