import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import { ToastStore } from '@/core/toast/toast-store';
import { SavingIds } from '@/core/utils/saving-ids';
import { filterByName } from '@/core/utils/search';
import {
  addToTierlistErrorMessage,
  containsRestaurant,
  withAddedRestaurant,
} from '@/core/utils/tierlist';
import { SearchDialog } from '@/shared/ui/search-dialog/search-dialog';

/**
 * A restaurant the owner of the tierlist rated, offered by the popup.
 */
interface RatedRestaurant {
  /**
   * Id of the restaurant
   */
  restaurantId: string;

  /**
   * Name of the restaurant
   */
  name: string;

  /**
   * Emoji of the restaurant
   */
  emoji: string;

  /**
   * Postal address of the restaurant, empty when unknown
   */
  address: string;
}

/**
 * Popup of the tierlist page adding restaurants to the tierlist, for its owner: the restaurants they rated that are not
 * in it, the most recently rated first, filtered by a search. Each one has a button adding it; once added, it leaves
 * the list and a toast confirms it, and the popup stays open so several can be added. Errors (the API failing) are
 * toasts. Only the rated restaurants are offered: the API only adds the restaurants the owner of the tierlist rated.
 */
@Component({
  imports: [SearchDialog],
  selector: 'app-add-restaurants-dialog',
  styleUrl: './add-restaurants-dialog.scss',
  templateUrl: './add-restaurants-dialog.html',
})
export class AddRestaurantsDialog {
  /**
   * The tierlist the restaurants are added to; each restaurant added is merged into it, which the page shows
   */
  readonly tierlist = model.required<Tierlist>();

  /**
   * Every rating of the owner of the tierlist, the most recent first, as the API sends them: the restaurants offered
   */
  readonly ratings = input.required<readonly UserRating[]>();

  /**
   * The popup asks to be closed (× button, Esc or a click outside)
   */
  readonly closed = output<void>();

  /**
   * Adds the restaurants to the tierlist
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Confirms each restaurant added, and shows the errors, at the bottom of the screen
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Restaurants the owner rated, each once (from its active rating), the most recently rated first
   */
  private readonly ratedRestaurants = computed(() =>
    this.ratings()
      .filter((rating) => rating.isActive)
      .map((rating): RatedRestaurant => ({
        restaurantId: rating.restaurantId,
        name: rating.restaurantName,
        emoji: rating.restaurantEmoji,
        address: rating.restaurantAddress,
      })),
  );

  /**
   * The rated restaurants not in the tierlist yet; one leaves it once added
   */
  private readonly addableRestaurants = computed(() =>
    this.ratedRestaurants().filter((r) => !containsRestaurant(this.tierlist(), r.restaurantId)),
  );

  /**
   * True when the owner rated no restaurant at all, so none can be added
   */
  protected readonly noRatedRestaurant = computed(() => this.ratedRestaurants().length === 0);

  /**
   * True when every restaurant the owner rated is in the tierlist already
   */
  protected readonly allAdded = computed(
    () => !this.noRatedRestaurant() && this.addableRestaurants().length === 0,
  );

  /**
   * Text typed in the search field
   */
  protected readonly query = signal('');

  /**
   * The restaurants listed: the ones not in the tierlist yet, filtered by the search
   */
  protected readonly shownRestaurants = computed(() =>
    filterByName(this.addableRestaurants(), this.query()),
  );

  /**
   * Ids of the restaurants being added: their button is disabled, so the restaurant is not sent twice
   */
  protected readonly saving = new SavingIds<string>();

  /**
   * Adds `restaurant` to the tierlist, then confirms it in a toast, the restaurant leaving the list; a toast says why
   * when the API fails, the restaurant staying in the list
   */
  protected async add(restaurant: RatedRestaurant): Promise<void> {
    const { id, name } = this.tierlist();
    await this.saving.run(restaurant.restaurantId, async () => {
      try {
        const saved = await firstValueFrom(
          this.tierlistApi.addRestaurantToTierlist(id, restaurant.restaurantId),
        );
        this.tierlist.update((tierlist) =>
          withAddedRestaurant(tierlist, saved, restaurant.restaurantId),
        );
        this.toasts.show(`${restaurant.name} added to ${name}.`, 'success');
      } catch (error) {
        this.toasts.show(addToTierlistErrorMessage(error, restaurant.name, name));
      }
    });
  }
}
