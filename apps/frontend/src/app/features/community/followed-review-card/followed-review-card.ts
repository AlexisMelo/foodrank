import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { FollowedRating } from '@/core/models/rating.model';
import { RecentReviewCard } from '@/shared/ui/recent-review-card/recent-review-card';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Card of a recent rating by a user the logged-in user follows: the review card of the home page, opening the
 * restaurant, with a chip of its author (picture and name) across its bottom border, opening the author's profile.
 */
@Component({
  imports: [RouterLink, RecentReviewCard, UserAvatar],
  selector: 'app-followed-review-card',
  styleUrl: './followed-review-card.scss',
  templateUrl: './followed-review-card.html',
})
export class FollowedReviewCard {
  /**
   * Rating shown, with its restaurant and its author
   */
  readonly rating = input.required<FollowedRating>();
}
