import { Signal, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserProfile, UserSummary } from '@/core/models/user.model';
import { ToastStore } from '@/core/toast/toast-store';
import { followButtonLabel } from '@/core/utils/follow';
import { displayedName } from '@/core/utils/profile';

/**
 * Follows of a profile being loaded by injectProfileFollows, shared by the counts under the user's name
 * (ProfileFollows) and the follow button next to their number of restaurants rated (FollowButton).
 */
export interface ProfileFollowsState {
  /**
   * Real id of the user shown; undefined while their profile is not loaded
   */
  userId: Signal<string | undefined>;

  /**
   * Users following the user shown, the most recent first; empty until loaded
   */
  followers: Signal<readonly UserSummary[]>;

  /**
   * Users the user shown follows, the most recent first; empty until loaded
   */
  following: Signal<readonly UserSummary[]>;

  /**
   * True once both lists are loaded: until then placeholders stand in place of the counts and the button
   */
  loaded: Signal<boolean>;

  /**
   * True when the API failed to give one of the lists: the counts and the button are hidden
   */
  loadError: Signal<boolean>;

  /**
   * True on the logged-in user's own profile: no follow button, a user cannot follow themselves
   */
  isOwnProfile: Signal<boolean>;

  /**
   * True when the logged-in user follows the user shown: they are among the followers
   */
  isFollowing: Signal<boolean>;

  /**
   * Text of the follow button, from whether each user follows the other: "Following", "Follow back" or "Follow"
   */
  followLabel: Signal<string>;

  /**
   * True while a follow or an unfollow is saved: the button is disabled meanwhile
   */
  saving: Signal<boolean>;

  /**
   * Follows the user shown, or unfollows them when the logged-in user already follows them. The followers become the
   * API's answer, which the counts and the button show; on failure a toast, and nothing changes.
   */
  toggleFollow: () => Promise<void>;
}

/**
 * Followers and users followed of a profile, loaded from the API by rxResources of the calling page, with the follow
 * and unfollow of the logged-in user. Reloaded each time the user shown changes; an answer for a user no longer shown
 * is ignored. Must run in an injection context.
 * @param profile profile shown, with the user's real id (never "me": the follow endpoints only take user ids); null
 * while it loads
 */
export function injectProfileFollows(profile: () => UserProfile | null): ProfileFollowsState {
  const userApi = inject(UserApi);
  const auth = inject(AuthStore);
  const toasts = inject(ToastStore);

  const userId = computed(() => profile()?.id);
  // Replaced by the API's answer once the logged-in user follows or unfollows the user shown
  const followersResource = rxResource({
    params: userId,
    stream: ({ params: id }) => userApi.fetchFollowers(id),
  });
  const followingResource = rxResource({
    params: userId,
    stream: ({ params: id }) => userApi.fetchFollowing(id),
  });

  const followers = computed<readonly UserSummary[]>(() =>
    followersResource.hasValue() ? followersResource.value() : [],
  );
  const following = computed<readonly UserSummary[]>(() =>
    followingResource.hasValue() ? followingResource.value() : [],
  );
  const isFollowing = computed(() => followers().some((user) => user.id === auth.loggedInUserId()));
  const saving = signal(false);

  return {
    userId,
    followers,
    following,
    loaded: computed(() => followersResource.hasValue() && followingResource.hasValue()),
    loadError: computed(
      () => followersResource.status() === 'error' || followingResource.status() === 'error',
    ),
    isOwnProfile: computed(() => userId() === auth.loggedInUserId()),
    isFollowing,
    followLabel: computed(() =>
      followButtonLabel(
        isFollowing(),
        following().some((user) => user.id === auth.loggedInUserId()),
      ),
    ),
    saving: saving.asReadonly(),
    toggleFollow: async () => {
      const shown = profile();
      if (!shown || saving()) return;
      const unfollow = isFollowing();
      saving.set(true);
      try {
        const answer = await firstValueFrom(
          unfollow ? userApi.unfollow(shown.id) : userApi.follow(shown.id),
        );
        // An answer for a user no longer shown is ignored
        if (userId() === shown.id) followersResource.set(answer);
      } catch {
        toasts.show(
          `Couldn't ${unfollow ? 'unfollow' : 'follow'} ${displayedName(shown)}, try again.`,
        );
      } finally {
        saving.set(false);
      }
    },
  };
}
