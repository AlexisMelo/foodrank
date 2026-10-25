import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom, map } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import type { Tierlist } from '@/core/models/tierlist.model';
import { ToastStore } from '@/core/toast/toast-store';
import { restaurantCountLabel } from '@/core/utils/profile';
import { byLastUpdate, containsRestaurant, filterTierlistsByName } from '@/core/utils/tierlist';
import { SearchDialog } from '@/shared/ui/search-dialog/search-dialog';

/**
 * True when the API refused the addition because the restaurant is already in the tierlist (409)
 */
function isAlreadyInTierlist(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * Popup of the restaurant page adding the restaurant to the logged-in user's tierlists: their tierlists, the most
 * recently updated first, filtered by a search. Tapping a tierlist adds the restaurant to it, and the popup stays open
 * so it can be added to several; a tierlist already holding it shows "Added ✓" and a button removing it. Errors (the
 * restaurant already in the tierlist, the API failing) are toasts. Only offered once the user rated the restaurant:
 * the API only adds the restaurants the owner of the tierlist rated.
 */
@Component({
  imports: [RouterLink, SearchDialog],
  selector: 'app-add-to-tierlist-dialog',
  styleUrl: './add-to-tierlist-dialog.scss',
  templateUrl: './add-to-tierlist-dialog.html',
})
export class AddToTierlistDialog {
  /**
   * Database id of the restaurant added
   */
  readonly restaurantId = input.required<string>();

  /**
   * Name of the restaurant, in the toasts
   */
  readonly restaurantName = input.required<string>();

  /**
   * The popup asks to be closed (× button, Esc or a click outside)
   */
  readonly closed = output<void>();

  /**
   * Reads the user's tierlists, adds the restaurant to them and removes it
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Shows the errors at the bottom of the screen
   */
  private readonly toasts = inject(ToastStore);

  /**
   * The logged-in user's tierlists, loaded each time the popup opens, the most recently updated first. Sorted once:
   * a tierlist changed in the popup keeps its place, so the rows do not move under the finger. Each one is replaced
   * by the API's answer once the restaurant is added to it or removed from it
   */
  private readonly tierlistsResource = rxResource({
    stream: () => this.tierlistApi.fetchTierlistsByUserId().pipe(map(byLastUpdate)),
  });

  /**
   * True while the tierlists load
   */
  protected readonly loading = this.tierlistsResource.isLoading;

  /**
   * True when the tierlists could not be loaded
   */
  protected readonly loadError = computed(() => this.tierlistsResource.status() === 'error');

  /**
   * True when the user has no tierlist at all, whatever the search: the popup offers to create one
   */
  protected readonly noTierlists = computed(
    () => this.tierlistsResource.hasValue() && this.tierlistsResource.value().length === 0,
  );

  /**
   * Text typed in the search field
   */
  protected readonly query = signal('');

  /**
   * The tierlists listed, filtered by the search; empty while loading and when the API fails
   */
  protected readonly shownTierlists = computed(() =>
    filterTierlistsByName(
      this.tierlistsResource.hasValue() ? this.tierlistsResource.value() : [],
      this.query(),
    ),
  );

  /**
   * Ids of the tierlists whose change is being saved: their row is disabled, so the change is not sent twice
   */
  protected readonly savingIds = signal<ReadonlySet<number>>(new Set());

  /**
   * Label of the number of restaurants: "1 restaurant", "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;

  /**
   * True when the restaurant is in `tierlist`
   */
  protected contains(tierlist: Tierlist): boolean {
    return containsRestaurant(tierlist, this.restaurantId());
  }

  /**
   * Adds the restaurant to `tierlist`; a toast says why when it is already in it (as known, or as answered by the API)
   * or when the API fails
   */
  protected async add(tierlist: Tierlist): Promise<void> {
    if (this.savingIds().has(tierlist.id)) return;
    const alreadyIn = `${this.restaurantName()} is already in ${tierlist.name}.`;
    if (this.contains(tierlist)) {
      this.toasts.show(alreadyIn);
      return;
    }
    await this.save(
      tierlist,
      this.tierlistApi.addRestaurantToTierlist(tierlist.id, this.restaurantId()),
      (error) =>
        isAlreadyInTierlist(error)
          ? alreadyIn
          : `Couldn't add ${this.restaurantName()} to ${tierlist.name}, try again.`,
    );
  }

  /**
   * Removes the restaurant from `tierlist`; a toast says when the API fails
   */
  protected async remove(tierlist: Tierlist): Promise<void> {
    if (this.savingIds().has(tierlist.id)) return;
    await this.save(
      tierlist,
      this.tierlistApi.removeRestaurantFromTierlist(tierlist.id, this.restaurantId()),
      () => `Couldn't remove ${this.restaurantName()} from ${tierlist.name}, try again.`,
    );
  }

  /**
   * Sends `request` changing `tierlist`, its row disabled meanwhile, and lists the tierlist answered by the API in its
   * place; on failure, shows the toast `failure` gives for the error, the row unchanged
   */
  private async save(
    tierlist: Tierlist,
    request: Observable<Tierlist>,
    failure: (error: unknown) => string,
  ): Promise<void> {
    this.savingIds.update((ids) => new Set(ids).add(tierlist.id));
    try {
      const saved = await firstValueFrom(request);
      this.tierlistsResource.value.update((tierlists) =>
        tierlists?.map((t) => (t.id === saved.id ? saved : t)),
      );
    } catch (error) {
      this.toasts.show(failure(error));
    } finally {
      this.savingIds.update((ids) => {
        const remaining = new Set(ids);
        remaining.delete(tierlist.id);
        return remaining;
      });
    }
  }
}
