import { Component, computed, input, model, output, signal } from '@angular/core';
import type { Tierlist } from '@/core/models/tierlist.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import { containsRestaurant, filterTierlistsByName, toggleId } from '@/core/utils/tierlist';
import { LockIcon } from '@/shared/ui/lock-icon/lock-icon';
import { SearchDialog } from '@/shared/ui/search-dialog/search-dialog';

/**
 * Popup of the review page picking the tierlists the restaurant is added to once the review is saved: the user's
 * tierlists filtered by a search, each with a checkbox bound to the page's selection (the same as its chips). The
 * tierlists already holding the restaurant show a padlock instead, and cannot be selected. It only selects: nothing is
 * saved before the review.
 */
@Component({
  imports: [LockIcon, SearchDialog],
  selector: 'app-tierlist-select-dialog',
  styleUrl: './tierlist-select-dialog.scss',
  templateUrl: './tierlist-select-dialog.html',
})
export class TierlistSelectDialog {
  /**
   * The user's tierlists, in the order listed
   */
  readonly tierlists = input.required<Tierlist[]>();

  /**
   * Database id of the restaurant reviewed
   */
  readonly restaurantId = input.required<string>();

  /**
   * Ids of the tierlists selected, shared with the chips of the review page
   */
  readonly selected = model.required<number[]>();

  /**
   * The popup asks to be closed (Done, × button, Esc or a click outside), the selection kept
   */
  readonly closed = output<void>();

  /**
   * Text typed in the search field
   */
  protected readonly query = signal('');

  /**
   * The tierlists listed, filtered by the search
   */
  protected readonly shownTierlists = computed(() =>
    filterTierlistsByName(this.tierlists(), this.query()),
  );

  /**
   * Label of the number of restaurants: "1 restaurant", "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;

  /**
   * Tooltip of the padlock of a tierlist already holding the restaurant
   */
  protected readonly alreadyInReason = 'The restaurant is already in this tierlist';

  /**
   * True when `tierlist` already holds the restaurant: a padlock instead of its checkbox, it cannot be selected
   */
  protected isAlreadyIn(tierlist: Tierlist): boolean {
    return containsRestaurant(tierlist, this.restaurantId());
  }

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
