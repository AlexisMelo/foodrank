import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Small card of a friend (round profile picture and name), the size of a tierlist card of the home page, opening the
 * friend's profile.
 */
@Component({
  imports: [RouterLink, UserAvatar],
  selector: 'app-friend-chip',
  styleUrl: './friend-chip.scss',
  templateUrl: './friend-chip.html',
})
export class FriendChip {
  /**
   * Id of the friend, used in /user/:id
   */
  readonly id = input.required<string>();

  /**
   * Name of the friend, cut with an ellipsis when too long
   */
  readonly name = input.required<string>();

  /**
   * Profile picture of the friend, null when there is none (their initial is shown instead)
   */
  readonly avatarUrl = input.required<string | null>();
}
