import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { restaurantCountLabel } from '@/core/utils/profile';

/**
 * A tierlist of the tierlists page: its cover emoji, its name and its number of restaurants. Opens the tierlist page.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-tierlist-card',
  styleUrl: './tierlist-card.scss',
  templateUrl: './tierlist-card.html',
})
export class TierlistCard {
  /**
   * Id of the tierlist, used in /tierlists/:id
   */
  readonly id = input.required<number>();

  /**
   * Name of the tierlist
   */
  readonly name = input.required<string>();

  /**
   * A single emoji, used as the tierlist picture
   */
  readonly emoji = input.required<string>();

  /**
   * Number of restaurants of the tierlist
   */
  readonly restaurantCount = input.required<number>();

  /**
   * Pinned to its owner's profile: shows a small pin next to the name
   */
  readonly pinned = input(false);

  /**
   * Label of the number of restaurants: "1 restaurant", "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;
}
