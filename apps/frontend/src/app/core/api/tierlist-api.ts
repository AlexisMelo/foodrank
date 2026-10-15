import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { Tierlist, TierlistInput } from '@/core/models/tierlist.model';
import { recoverOnStatus } from './recover-on-status';
import { ME } from './user-api';

/** Tierlists of the API (/api/tierlists, /api/users/:id/tierlists). */
@Service()
export class TierlistApi {
  /** Sends the requests to the API */
  private readonly http = inject(HttpClient);

  /**
   * Create a tierlist, without restaurants, for the logged-in user
   * @throws the HttpErrorResponse: 400 for invalid values, 401 when not logged in
   */
  createTierlist(tierlist: TierlistInput): Observable<void> {
    return this.http.post('/api/tierlists', tierlist).pipe(map(() => undefined));
  }

  /**
   * Get the tierlists of a user (the logged-in user by default), with their restaurants, most recently created first
   */
  fetchTierlistsByUserId(userId: string = ME): Observable<Tierlist[]> {
    return this.http.get<Tierlist[]>(`/api/users/${encodeURIComponent(userId)}/tierlists`);
  }

  /**
   * Get a tierlist, of any user, with its restaurants
   * @param id id of the tierlist, as read from the url
   * @returns undefined when it does not exist
   */
  fetchTierlistById(id: string | number): Observable<Tierlist | undefined> {
    return this.http
      .get<Tierlist>(`/api/tierlists/${encodeURIComponent(id)}`)
      .pipe(recoverOnStatus(404, undefined));
  }

  /**
   * Get the tierlists a user (the logged-in user by default) pinned to its profile, most recently created first
   */
  fetchPinnedTierlistsByUserId(userId: string = ME): Observable<Tierlist[]> {
    return this.fetchTierlistsByUserId(userId).pipe(
      map((tierlists) => tierlists.filter((t) => t.pinned)),
    );
  }

  /**
   * Pin a tierlist of the logged-in user to their profile, or unpin it
   * @returns the updated tierlist
   * @throws the HttpErrorResponse: 401 when not logged in, 403 for a tierlist of another user, 404 when it does not exist
   */
  setTierlistPinned(id: number, pinned: boolean): Observable<Tierlist> {
    return this.http.put<Tierlist>(`/api/tierlists/${encodeURIComponent(id)}/pinned`, { pinned });
  }
}
