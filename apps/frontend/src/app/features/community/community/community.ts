import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RatingApi } from '@/core/api/rating-api';
import { pickRandom } from '@/core/utils/random';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { FollowedReviewCard } from '../followed-review-card/followed-review-card';
import { FriendChip } from '../friend-chip/friend-chip';
import { injectMyFriends } from '../my-friends';

/**
 * Number of friends shown on the page, picked at random among all of them; "See all" lists every friend.
 */
export const SHOWN_FRIENDS_COUNT = 5;

/**
 * Number of recent reviews of the users followed shown on the page.
 */
export const FOLLOWED_REVIEWS_COUNT = 5;

/**
 * Community page (/community): what the other users do. A few friends of the logged-in user (users who follow each
 * other) picked at random, with a link to all of them, and the latest reviews of the users they follow, each with its
 * author.
 */
@Component({
  imports: [RouterLink, FollowedReviewCard, FriendChip, DisplayedNamePipe],
  selector: 'app-community',
  styleUrl: './community.scss',
  templateUrl: './community.html',
})
export class Community {
  /**
   * Reads the latest ratings of the users followed
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * Every friend of the logged-in user, from GET /api/users/:id/friends
   */
  protected readonly myFriends = injectMyFriends();

  /**
   * SHOWN_FRIENDS_COUNT friends picked at random, picked again only when the friends are loaded again (each visit)
   */
  protected readonly shownFriends = computed(() =>
    pickRandom(this.myFriends.friends(), SHOWN_FRIENDS_COUNT),
  );

  /**
   * Latest ratings of the users the logged-in user follows, most recent first
   */
  private readonly reviewsResource = rxResource({
    stream: () => this.ratingApi.fetchFollowedRatings(FOLLOWED_REVIEWS_COUNT),
  });

  /**
   * Latest ratings of the users followed, most recent first; empty while loading and when the API fails
   */
  protected readonly reviews = computed(() =>
    this.reviewsResource.hasValue() ? this.reviewsResource.value() : [],
  );

  /**
   * True while the reviews load
   */
  protected readonly reviewsLoading = this.reviewsResource.isLoading;

  /**
   * True when the reviews could not be loaded; the friends still show
   */
  protected readonly reviewsLoadError = computed(() => this.reviewsResource.status() === 'error');
}
