import { Component, input, model } from '@angular/core';

/**
 * A way to sort a list, offered by a chip.
 */
export interface SortOption<K extends string> {
  /**
   * Key of the order, given to the page when its chip is picked
   */
  key: K;

  /**
   * Text of the chip, e.g. "Recently updated"
   */
  label: string;
}

/**
 * Row of chips choosing the order of a list (tierlists, restaurants): one chip per order, the chosen one filled in
 * white. Picking a chip sets `value`, which the page sorts its list by.
 */
@Component({
  selector: 'app-sort-chips',
  styleUrl: './sort-chips.scss',
  templateUrl: './sort-chips.html',
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
  },
})
export class SortChips<K extends string> {
  /**
   * Orders offered, in display order
   */
  readonly options = input.required<readonly SortOption<K>[]>();

  /**
   * Key of the chosen order, set when a chip is picked
   */
  readonly value = model.required<K>();

  /**
   * Accessible name of the row of chips
   */
  readonly label = input('Sort by');
}
