import { Component, computed, input } from '@angular/core';

/**
 * Round profile picture of a user, or the initial of their name when they have none. Size, background and font size
 * come from the parent, through a class set on the component.
 */
@Component({
  imports: [],
  selector: 'app-user-avatar',
  styleUrl: './user-avatar.scss',
  templateUrl: './user-avatar.html',
})
export class UserAvatar {
  /**
   * Name of the user, whose initial is shown when there is no picture
   */
  readonly name = input.required<string>();

  /**
   * Profile picture, null when there is none
   */
  readonly avatarUrl = input.required<string | null>();

  /**
   * Shown instead of the profile picture when the user has none
   */
  protected readonly initial = computed(() => this.name().charAt(0).toUpperCase());
}
