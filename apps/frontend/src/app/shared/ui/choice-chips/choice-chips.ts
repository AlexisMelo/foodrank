import { Component, input, model } from '@angular/core';

/**
 * One of the options offered by a row of choice chips (an order, a filter).
 */
export interface ChipOption<K extends string> {
  /**
   * Key of the option, given to the page when its chip is picked
   */
  key: K;

  /**
   * Text of the chip, e.g. "Recently updated"
   */
  label: string;
}

/**
 * Row of chips choosing one option among a few: the order of a list (tierlists, restaurants), the results shown by the
 * search. One chip per option, the chosen one filled in white. Picking a chip sets `value`, which the page applies.
 */
@Component({
  selector: 'app-choice-chips',
  styleUrl: './choice-chips.scss',
  templateUrl: './choice-chips.html',
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
  },
})
export class ChoiceChips<K extends string> {
  /**
   * Options offered, in display order
   */
  readonly options = input.required<readonly ChipOption<K>[]>();

  /**
   * Key of the chosen option, set when a chip is picked
   */
  readonly value = model.required<K>();

  /**
   * Accessible name of the row of chips, e.g. "Sort by"
   */
  readonly label = input.required<string>();
}
