import { Component, computed, input } from '@angular/core';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Top of a profile page: the user's avatar, name and number of restaurants rated.
 */
@Component({
  imports: [UserAvatar],
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
