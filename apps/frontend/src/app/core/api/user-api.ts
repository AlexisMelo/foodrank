import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { UserProfile } from '@/core/models/user.model';
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
   * Get the users whose pseudonym contains the query, ignoring case, best matches first (same pseudonym, then starting
   * with the query); at most 20, never the logged-in user
   */
  searchUsers(query: string): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>('/api/users/search', { params: { query } });
  }
}
