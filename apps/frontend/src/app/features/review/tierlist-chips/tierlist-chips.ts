import { Component, computed, input, model, output } from '@angular/core';
import type { Tierlist } from '@/core/models/tierlist.model';
import { containsRestaurant, toggleId } from '@/core/utils/tierlist';

/**
 * Number of tierlists offered as chips on the review page, the most recently updated; the others are in the search
 * popup
 */
export const TIERLIST_CHIPS_COUNT = 2;

/**
 * Row of chips of the review page selecting the tierlists the restaurant is added to once the review is saved: a
 * "Search" chip opening the popup listing every tierlist, then a toggle chip for each of the TIERLIST_CHIPS_COUNT most
 * recently updated tierlists the restaurant can be added to (not those already holding it), and for each other one
 * selected in the popup, so a selection is never hidden.
 */
@Component({
  selector: 'app-tierlist-chips',
  styleUrl: './tierlist-chips.scss',
  templateUrl: './tierlist-chips.html',
})
export class TierlistChips {
  /**
   * The user's tierlists, the most recently updated first
   */
  readonly tierlists = input.required<Tierlist[]>();

  /**
   * Database id of the restaurant reviewed
   */
  readonly restaurantId = input.required<string>();

  /**
   * True while nothing can be selected (page locked, review being saved): every chip is disabled
   */
  readonly disabled = input(false);

  /**
   * Ids of the tierlists selected, shared with the search popup
   */
  readonly selected = model.required<number[]>();

  /**
   * The "Search" chip was clicked: the page opens the popup searching the tierlists
   */
  readonly searchRequested = output<void>();

  /**
   * Tierlists shown as chips, in the order received: the TIERLIST_CHIPS_COUNT first ones not holding the restaurant
   * yet, and the other ones selected
   */
  protected readonly shownTierlists = computed(() =>
    this.tierlists()
      .filter((tierlist) => !containsRestaurant(tierlist, this.restaurantId()))
      .filter((tierlist, index) => index < TIERLIST_CHIPS_COUNT || this.isSelected(tierlist)),
  );

  /**
   * True when `tierlist` is selected
   */
  protected isSelected(tierlist: Tierlist): boolean {
    return this.selected().includes(tierlist.id);
  }

  /**
   * Selects `tierlist`, or unselects it
   */
  protected toggle(tierlist: Tierlist): void {
    this.selected.update((ids) => toggleId(ids, tierlist.id));
  }
}
