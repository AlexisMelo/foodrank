import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { UserAvatar } from '../user-avatar/user-avatar';

/**
 * Button showing the logged-in user's avatar and name, opening their profile page.
 */
@Component({
  imports: [UserAvatar],
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
   * Opens the profile page on click
   */
  private readonly router = inject(Router);

  /**
   * Number of restaurants rated, e.g. "3 restaurants"
   */
  protected readonly countLabel = computed(() =>
    restaurantCountLabel(this.profile().ratedRestaurantsCount),
  );

  /**
   * Opens the logged-in user's profile page
   */
  protected openProfile(): void {
    void this.router.navigateByUrl('/profile');
  }
}
