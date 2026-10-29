import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { UserAvatar } from '../user-avatar/user-avatar';

/**
 * Link showing the logged-in user's avatar and name (with their username under their display name, when they have
 * one), opening their profile page.
 */
@Component({
  imports: [RouterLink, UserAvatar, DisplayedNamePipe],
  selector: 'app-user-bar',
  styleUrl: './user-bar.scss',
  templateUrl: './user-bar.html',
})
export class UserBar {
  /**
   * Profile shown, from GET /api/users/me
   */
  readonly profile = input.required<UserProfile>();

  /**
   * Shows the number of restaurants rated next to the name
   */
  readonly showCount = input(false, { transform: booleanAttribute });

  /**
   * Number of restaurants rated, e.g. "3 restaurants"
   */
  protected readonly countLabel = computed(() =>
    restaurantCountLabel(this.profile().ratedRestaurantsCount),
  );
}
