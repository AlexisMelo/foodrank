import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Top of a profile page: the user's avatar, name (their display name above their username, or their username alone)
 * and number of restaurants rated, with an "Edit profile" button next to it on the logged-in user's own profile. The
 * content given to it is shown under the name (the follows of the profile), except an `app-follow-button`, shown next
 * to the number of restaurants rated.
 */
@Component({
  imports: [RouterLink, UserAvatar, DisplayedNamePipe],
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
   * True on the logged-in user's own profile: shows the "Edit profile" button, opening /profile/edit
   */
  readonly editable = input(false, { transform: booleanAttribute });

  /**
   * Number of restaurants rated, as "1 restaurant" or "3 restaurants"
   */
  protected readonly countLabel = computed(() =>
    restaurantCountLabel(this.profile().ratedRestaurantsCount),
  );
}
