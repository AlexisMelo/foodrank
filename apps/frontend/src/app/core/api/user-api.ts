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
}
