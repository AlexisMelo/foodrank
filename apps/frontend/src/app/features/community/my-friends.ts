import { Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserSummary } from '@/core/models/user.model';

/**
 * Friends of the logged-in user being loaded by injectMyFriends, as read-only signals.
 */
export interface MyFriendsState {
  /**
   * Friends, the most recent follow of the logged-in user first; empty while loading and when the API fails
   */
  friends: Signal<readonly UserSummary[]>;

  /**
   * True while the friends load
   */
  loading: Signal<boolean>;

  /**
   * True when the API failed
   */
  loadError: Signal<boolean>;
}

/**
 * Friends of the logged-in user (users they follow who follow them back), loaded from the API by an rxResource of the
 * calling page, with the user's real id (the friends endpoint does not take "me"). State is per call so each page shows
 * fresh data (e.g. right after following someone back). Must run in an injection context.
 */
export function injectMyFriends(): MyFriendsState {
  const api = inject(UserApi);
  const auth = inject(AuthStore);
  const resource = rxResource({
    // Undefined while logged out: the resource stays idle
    params: () => auth.loggedInUserId() ?? undefined,
    stream: ({ params: userId }) => api.fetchFriends(userId),
  });

  return {
    friends: computed(() => (resource.hasValue() ? resource.value() : [])),
    loading: resource.isLoading,
    loadError: computed(() => resource.status() === 'error'),
  };
}
