import { Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ME, UserApi } from '@/core/api/user-api';
import type { UserProfile } from '@/core/models/user.model';

/**
 * Profile of a user being loaded by injectUserProfile, as read-only signals.
 */
export interface UserProfileState {
  /**
   * Loaded profile; null while loading, when the user does not exist or when the API fails
   */
  profile: Signal<UserProfile | null>;

  /**
   * True while the profile loads, including after a change of user
   */
  loading: Signal<boolean>;

  /**
   * True when the API answered that the user does not exist (404)
   */
  notFound: Signal<boolean>;

  /**
   * True when the API failed for another reason than an unknown user
   */
  loadError: Signal<boolean>;
}

/**
 * Profile of a user (name, avatar, number of restaurants rated), loaded from the API by an rxResource of the calling
 * page. Reloaded each time the id changes, and a late answer for a previous id is ignored. State is per call, so each
 * page shows fresh data (e.g. the restaurants count right after a new rating). Must run in an injection context.
 * @param userId id of the user, "me" (default) for the logged-in user
 */
export function injectUserProfile(userId: () => string = () => ME): UserProfileState {
  const api = inject(UserApi);
  const resource = rxResource({
    params: userId,
    stream: ({ params }) => api.fetchUserProfile(params),
  });

  return {
    profile: computed(() => (resource.hasValue() ? (resource.value() ?? null) : null)),
    loading: resource.isLoading,
    notFound: computed(() => resource.status() === 'resolved' && !resource.value()),
    loadError: computed(() => resource.status() === 'error'),
  };
}
