import { Component, input } from '@angular/core';
import type { ProfileFollowsState } from '../profile-follows-state';

/**
 * Button following or unfollowing the user of another profile, next to their number of restaurants rated: "Follow",
 * "Follow back" when they already follow the logged-in user, "Following" once followed. A placeholder of the same size
 * stands in its place while the follows load; nothing on the logged-in user's own profile, nor when the follows cannot
 * be loaded. Errors are toasts.
 */
@Component({
  imports: [],
  selector: 'app-follow-button',
  styleUrl: './follow-button.scss',
  templateUrl: './follow-button.html',
})
export class FollowButton {
  /**
   * Follows of the profile shown, from injectProfileFollows
   */
  readonly follows = input.required<ProfileFollowsState>();
}
