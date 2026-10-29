import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserProfile, UserSummary } from '@/core/models/user.model';
import { ToastStore } from '@/core/toast/toast-store';
import { followButtonLabel, followersCountLabel } from '@/core/utils/follow';
import { type FollowList, FollowListDialog } from '../follow-list-dialog/follow-list-dialog';

/**
 * Follows of a profile, under the user's name: the number of users following them and of users they follow, each
 * opening the list in a full-screen popup, and on another user's profile the button following or unfollowing them
 * ("Follow", "Follow back" when they already follow the logged-in user, "Following" once followed). While the lists
 * load, placeholders of the same size stand in their place; the section is hidden when the API fails, a secondary part
 * of the profile not failing the page. Errors of the button are toasts.
 */
@Component({
  imports: [FollowListDialog],
  selector: 'app-profile-follows',
  styleUrl: './profile-follows.scss',
  templateUrl: './profile-follows.html',
})
export class ProfileFollows {
  /**
   * Profile shown, with the user's real id (never "me": the follow endpoints only take user ids)
   */
  readonly profile = input.required<UserProfile>();

  /**
   * Reads the follows, follows and unfollows
   */
  private readonly userApi = inject(UserApi);

  /**
   * Id of the logged-in user, to find them in the lists
   */
  private readonly auth = inject(AuthStore);

  /**
   * Shows the errors of the follow button at the bottom of the screen
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Id of the user shown, reloading the lists when it changes
   */
  private readonly userId = computed(() => this.profile().id);

  /**
   * Users following the user shown, the most recent first; replaced by the API's answer once the logged-in user
   * follows or unfollows them
   */
  private readonly followersResource = rxResource({
    params: () => this.userId(),
    stream: ({ params: userId }) => this.userApi.fetchFollowers(userId),
  });

  /**
   * Users the user shown follows, the most recent first
   */
  private readonly followingResource = rxResource({
    params: () => this.userId(),
    stream: ({ params: userId }) => this.userApi.fetchFollowing(userId),
  });

  /**
   * True once both lists are loaded: until then placeholders stand in place of the counts and the button
   */
  protected readonly loaded = computed(
    () => this.followersResource.hasValue() && this.followingResource.hasValue(),
  );

  /**
   * True when the API failed to give one of the lists: the section is hidden
   */
  protected readonly loadError = computed(
    () =>
      this.followersResource.status() === 'error' || this.followingResource.status() === 'error',
  );

  /**
   * Users following the user shown, the most recent first; empty until loaded
   */
  protected readonly followers = computed<readonly UserSummary[]>(() =>
    this.followersResource.hasValue() ? this.followersResource.value() : [],
  );

  /**
   * Users the user shown follows, the most recent first; empty until loaded
   */
  protected readonly following = computed<readonly UserSummary[]>(() =>
    this.followingResource.hasValue() ? this.followingResource.value() : [],
  );

  /**
   * Number of followers, e.g. "12 followers"
   */
  protected readonly followersLabel = computed(() => followersCountLabel(this.followers().length));

  /**
   * True on the logged-in user's own profile: no follow button, a user cannot follow themselves
   */
  protected readonly isOwnProfile = computed(() => this.userId() === this.auth.loggedInUserId());

  /**
   * True when the logged-in user follows the user shown: they are among the followers
   */
  protected readonly isFollowing = computed(() =>
    this.followers().some((user) => user.id === this.auth.loggedInUserId()),
  );

  /**
   * Text of the follow button, from whether each user follows the other
   */
  protected readonly followLabel = computed(() =>
    followButtonLabel(
      this.isFollowing(),
      this.following().some((user) => user.id === this.auth.loggedInUserId()),
    ),
  );

  /**
   * True while a follow or an unfollow is saved: the button is disabled meanwhile
   */
  protected readonly saving = signal(false);

  /**
   * List shown in the popup, null when it is closed; closed again when the user shown changes (e.g. a row of the
   * popup opened another profile)
   */
  protected readonly openList = linkedSignal<string, FollowList | null>({
    source: this.userId,
    computation: () => null,
  });

  /**
   * Follows the user shown, or unfollows them when the logged-in user already follows them. The followers become the
   * API's answer, which the counts and the button show; on failure a toast, and nothing changes.
   */
  protected async toggleFollow(): Promise<void> {
    if (this.saving()) return;
    const { id: userId, name } = this.profile();
    const unfollow = this.isFollowing();
    this.saving.set(true);
    try {
      const followers = await firstValueFrom(
        unfollow ? this.userApi.unfollow(userId) : this.userApi.follow(userId),
      );
      // An answer for a user no longer shown is ignored
      if (this.userId() === userId) this.followersResource.set(followers);
    } catch {
      this.toasts.show(`Couldn't ${unfollow ? 'unfollow' : 'follow'} ${name}, try again.`);
    } finally {
      this.saving.set(false);
    }
  }
}
