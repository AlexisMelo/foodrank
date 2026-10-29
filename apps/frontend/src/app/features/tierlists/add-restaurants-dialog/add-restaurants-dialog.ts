import {
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { ToastStore } from '@/core/toast/toast-store';
import {
  RESTAURANT_SORT_OPTIONS,
  type RankedRestaurant,
  type RestaurantSort,
  rankRestaurants,
  sortRestaurants,
} from '@/core/utils/ranking';
import { SavingIds } from '@/core/utils/saving-ids';
import { filterByName } from '@/core/utils/search';
import {
  addToTierlistErrorMessage,
  containsRestaurant,
  withAddedRestaurant,
  withRemovedRestaurant,
} from '@/core/utils/tierlist';
import { ChoiceChips } from '@/shared/ui/choice-chips/choice-chips';
import { SearchDialog } from '@/shared/ui/search-dialog/search-dialog';

/**
 * Popup of the tierlist page adding restaurants to the tierlist, for its owner, covering the whole screen: the
 * restaurants they rated that were not in it when the popup opened, the best score first by default (or the most
 * recently rated first, or by name), filtered by a search. Each one has a button adding it, which becomes a button
 * removing it once added, so an addition can be undone while the popup is open; the popup stays open so several can be
 * added. Errors (the API failing) are toasts. Only the rated restaurants are offered: the API only adds the restaurants
 * the owner of the tierlist rated.
 */
@Component({
  imports: [ChoiceChips, SearchDialog],
  selector: 'app-add-restaurants-dialog',
  styleUrl: './add-restaurants-dialog.scss',
  templateUrl: './add-restaurants-dialog.html',
})
export class AddRestaurantsDialog {
  /**
   * The tierlist the restaurants are added to and removed from; each change is merged into it, which the page shows
   */
  readonly tierlist = model.required<Tierlist>();

  /**
   * Every rating of the owner of the tierlist, the most recent first, as the API sends them: the restaurants offered
   */
  readonly ratings = input.required<readonly UserRating[]>();

  /**
   * The popup asks to be closed (× button or Esc)
   */
  readonly closed = output<void>();

  /**
   * Adds the restaurants to the tierlist, and removes them
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Shows the errors at the bottom of the screen
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Restaurants the owner rated, each once, with the scores and the moment of its active rating
   */
  private readonly ratedRestaurants = computed(() => rankRestaurants(this.ratings()));

  /**
   * Ids of the restaurants in the tierlist when the popup opened, read once (the tierlist is not tracked): they are not
   * offered. The popup is created on each opening, so a restaurant added is no longer offered the next time
   */
  private readonly idsInTierlistAtOpening = computed(
    () => new Set(untracked(this.tierlist).restaurants.map((entry) => entry.restaurantId)),
  );

  /**
   * The rated restaurants not in the tierlist when the popup opened; one added stays offered until the popup closes,
   * so the addition can be undone
   */
  private readonly offeredRestaurants = computed(() =>
    this.ratedRestaurants().filter((r) => !this.idsInTierlistAtOpening().has(r.restaurantId)),
  );

  /**
   * True when the owner rated no restaurant at all, so none can be added
   */
  protected readonly noRatedRestaurant = computed(() => this.ratedRestaurants().length === 0);

  /**
   * True when every restaurant the owner rated was in the tierlist when the popup opened
   */
  protected readonly allAdded = computed(
    () => !this.noRatedRestaurant() && this.offeredRestaurants().length === 0,
  );

  /**
   * Text typed in the search field
   */
  protected readonly query = signal('');

  /**
   * Sort chips of the list, in display order
   */
  protected readonly sortOptions = RESTAURANT_SORT_OPTIONS;

  /**
   * Order chosen by the owner, the best score first by default
   */
  protected readonly sortBy = signal<RestaurantSort>('score');

  /**
   * The restaurants listed: the ones offered, filtered by the search, in the chosen order
   */
  protected readonly shownRestaurants = computed(() =>
    sortRestaurants(filterByName(this.offeredRestaurants(), this.query()), this.sortBy()),
  );

  /**
   * Ids of the restaurants being added or removed: their button is disabled, so the change is not sent twice
   */
  protected readonly saving = new SavingIds<string>();

  /**
   * True when `restaurant` is in the tierlist: its button removes it
   */
  protected contains(restaurant: RankedRestaurant): boolean {
    return containsRestaurant(this.tierlist(), restaurant.restaurantId);
  }

  /**
   * Accessible name of the button of `restaurant`: "Add Pizza Roma to Date night", or "Remove Pizza Roma from Date
   * night" once `added`
   */
  protected toggleLabel(restaurant: RankedRestaurant, added: boolean): string {
    const tierlistName = this.tierlist().name;
    return added
      ? `Remove ${restaurant.name} from ${tierlistName}`
      : `Add ${restaurant.name} to ${tierlistName}`;
  }

  /**
   * Adds `restaurant` to the tierlist, or removes it when it is in it; a toast says why when the API fails, the
   * restaurant staying as it was
   */
  protected async toggle(restaurant: RankedRestaurant): Promise<void> {
    const { id, name } = this.tierlist();
    const { restaurantId } = restaurant;
    const added = this.contains(restaurant);
    await this.saving.run(restaurantId, async () => {
      try {
        if (added) {
          const saved = await firstValueFrom(
            this.tierlistApi.removeRestaurantFromTierlist(id, restaurantId),
          );
          this.tierlist.update((tierlist) => withRemovedRestaurant(tierlist, saved, restaurantId));
        } else {
          const saved = await firstValueFrom(
            this.tierlistApi.addRestaurantToTierlist(id, restaurantId),
          );
          this.tierlist.update((tierlist) => withAddedRestaurant(tierlist, saved, restaurantId));
        }
      } catch (error) {
        this.toasts.show(
          added
            ? `Couldn't remove ${restaurant.name} from ${name}, try again.`
            : addToTierlistErrorMessage(error, restaurant.name, name),
        );
      }
    });
  }
}
