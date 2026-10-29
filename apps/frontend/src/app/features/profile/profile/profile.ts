import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ME } from '@/core/api/user-api';
import {
  RESTAURANT_SORT_OPTIONS,
  type RestaurantSort,
  sortRestaurants,
} from '@/core/utils/ranking';
import { injectUserProfile } from '@/shared/data/user-profile';
import { ChoiceChips } from '@/shared/ui/choice-chips/choice-chips';
import { RankedRestaurantItem } from '@/shared/ui/ranked-restaurant-item/ranked-restaurant-item';
import { FollowButton } from '../follow-button/follow-button';
import { PinnedTierlists } from '../pinned-tierlists/pinned-tierlists';
import { ProfileFollows } from '../profile-follows/profile-follows';
import { injectProfileFollows } from '../profile-follows-state';
import { ProfileHeader } from '../profile-header/profile-header';
import { injectProfileRanking } from '../profile-ranking';

/**
 * Profile page: the logged-in user's on /profile, another user's on /user/:id (ownProfileGuard sends the logged-in
 * user's own id to /profile). Shows the user with their followers and the users they follow (and a follow button next
 * to their number of restaurants rated, on another user's profile), their pinned tierlists and the restaurants they
 * rated, the best score first by default, or the most recently rated first, or by name.
 */
@Component({
  imports: [
    ChoiceChips,
    FollowButton,
    PinnedTierlists,
    ProfileFollows,
    ProfileHeader,
    RankedRestaurantItem,
  ],
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
   * Followers and users followed of the user shown, loaded by their real id once their profile is loaded: shared by
   * the counts under their name and the follow button next to their number of restaurants rated
   */
  protected readonly follows = injectProfileFollows(this.user.profile);

  /**
   * Sort chips of the restaurants, in display order
   */
  protected readonly sortOptions = RESTAURANT_SORT_OPTIONS;

  /**
   * Order of the restaurants chosen by the user, the best score first by default
   */
  protected readonly sortBy = signal<RestaurantSort>('score');

  /**
   * Restaurants rated by the user shown, in the chosen order
   */
  protected readonly sortedRestaurants = computed(() =>
    sortRestaurants(this.ranking.rankedRestaurants(), this.sortBy()),
  );

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
