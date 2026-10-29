import { Component, computed, input } from '@angular/core';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Top of a profile page: the user's avatar, name (their display name above their username, or their username alone)
 * and number of restaurants rated. The content given to it (the follows of the profile) is shown under the name.
 */
@Component({
  imports: [UserAvatar, DisplayedNamePipe],
  selector: 'app-profile-header',
  styleUrl: './profile-header.scss',
  templateUrl: './profile-header.html',
})
export class ProfileHeader {
  /**
   * Profile of the user shown
   */
  readonly profile = input.required<UserProfile>();

  /**
   * Number of restaurants rated, as "1 restaurant" or "3 restaurants"
   */
  protected readonly countLabel = computed(() =>
    restaurantCountLabel(this.profile().ratedRestaurantsCount),
  );
}
