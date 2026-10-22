import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ME } from '@/core/api/user-api';
import { injectUserProfile } from '@/shared/data/user-profile';
import { RankedRestaurantItem } from '@/shared/ui/ranked-restaurant-item/ranked-restaurant-item';
import { PinnedTierlists } from '../pinned-tierlists/pinned-tierlists';
import { ProfileHeader } from '../profile-header/profile-header';
import { injectProfileRanking } from '../profile-ranking';

/**
 * Profile page: the logged-in user's on /profile, another user's on /user/:id (ownProfileGuard sends the logged-in
 * user's own id to /profile). Shows the user, their pinned tierlists and the restaurants they rated, best first.
 */
@Component({
  imports: [PinnedTierlists, ProfileHeader, RankedRestaurantItem],
  selector: 'app-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  /**
   * Id of the user, from /user/:id; undefined on /profile
   */
  readonly id = input<string>();

  /**
   * Leaves for the home page when the user does not exist
   */
  private readonly router = inject(Router);

  /**
   * Id of the user shown: "me" for the logged-in user on /profile
   */
  private readonly profileUserId = computed(() => this.id() || ME);

  /**
   * Name, avatar and number of restaurants rated of the user shown
   */
  protected readonly user = injectUserProfile(this.profileUserId);

  /**
   * Restaurants rated by the user shown, best first, with the logged-in user's own scores on another user's profile
   */
  protected readonly ranking = injectProfileRanking(this.profileUserId);

  /**
   * True while the profile or the ranking loads
   */
  protected readonly loading = computed(() => this.user.loading() || this.ranking.loading());

  constructor() {
    // Unknown user: back to the home page
    effect(() => {
      if (this.user.notFound()) void this.router.navigateByUrl('/', { replaceUrl: true });
    });
  }
}
