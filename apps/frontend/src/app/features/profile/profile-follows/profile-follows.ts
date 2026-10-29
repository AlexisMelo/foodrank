import { Component, computed, input, linkedSignal } from '@angular/core';
import { followersCountLabel } from '@/core/utils/follow';
import { type FollowList, FollowListDialog } from '../follow-list-dialog/follow-list-dialog';
import type { ProfileFollowsState } from '../profile-follows-state';

/**
 * Follows of a profile, under the user's name: the number of users following them and of users they follow, each
 * opening the list in a full-screen popup. While the lists load, a placeholder of the same size stands in their place;
 * the counts are hidden when the API fails, a secondary part of the profile not failing the page. The follow button
 * is FollowButton, next to the number of restaurants rated.
 */
@Component({
  imports: [FollowListDialog],
  selector: 'app-profile-follows',
  styleUrl: './profile-follows.scss',
  templateUrl: './profile-follows.html',
})
export class ProfileFollows {
  /**
   * Follows of the profile shown, from injectProfileFollows
   */
  readonly follows = input.required<ProfileFollowsState>();

  /**
   * Number of followers, e.g. "12 followers"
   */
  protected readonly followersLabel = computed(() =>
    followersCountLabel(this.follows().followers().length),
  );

  /**
   * List shown in the popup, null when it is closed; closed again when the user shown changes (e.g. a row of the
   * popup opened another profile)
   */
  protected readonly openList = linkedSignal<string | undefined, FollowList | null>({
    source: () => this.follows().userId(),
    computation: () => null,
  });
}
