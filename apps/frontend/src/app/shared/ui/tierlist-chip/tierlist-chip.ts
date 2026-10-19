import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Small square card of a tierlist (emoji cover and name), opening the tierlist page.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-tierlist-chip',
  styleUrl: './tierlist-chip.scss',
  templateUrl: './tierlist-chip.html',
})
export class TierlistChip {
  /**
   * Id of the tierlist, used in /tierlists/:id
   */
  readonly id = input.required<number>();

  /**
   * Name of the tierlist, cut with an ellipsis when too long
   */
  readonly name = input.required<string>();

  /**
   * Emoji used as the tierlist cover
   */
  readonly emoji = input.required<string>();
}
