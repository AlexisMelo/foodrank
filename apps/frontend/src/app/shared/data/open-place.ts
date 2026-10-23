import { Signal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { CelebrationStore } from '@/core/celebration/celebration-store';

/**
 * Opening of the places selected in a search, by injectOpenPlace: the action and its state, as read-only signals.
 */
export interface OpenPlaceState {
  /**
   * Id of the place being opened (its restaurant being stored); null when none is
   */
  opening: Signal<string | null>;

  /**
   * Id of the place whose opening last failed; null when the last one did not fail
   */
  failed: Signal<string | null>;

  /**
   * Stores the restaurant of the place, unless it already is, then opens its restaurant page; "The explorer" modal
   * shows on it when this user is the first to open the place. Does nothing while another place is being opened.
   * @returns true once the restaurant page is opened, false when the restaurant could not be stored
   */
  open(placeId: string): Promise<boolean>;
}

/**
 * Opens the places selected in a search (the new review sheet, the search results), from a click: storing the
 * restaurant is a mutation, so it runs here and not in the page that shows it. State is per call. Must run in an
 * injection context.
 */
export function injectOpenPlace(): OpenPlaceState {
  const api = inject(RestaurantApi);
  const router = inject(Router);
  const celebrations = inject(CelebrationStore);
  const opening = signal<string | null>(null);
  const failed = signal<string | null>(null);

  return {
    opening: opening.asReadonly(),
    failed: failed.asReadonly(),
    async open(placeId: string): Promise<boolean> {
      if (opening()) return false;
      opening.set(placeId);
      failed.set(null);
      try {
        // When another user stores it at the same moment, the API returns it with created false: no explorer here
        const { restaurant, created } = await firstValueFrom(
          api.createRestaurantFromPlace(placeId),
        );
        if (created) celebrations.celebrate(restaurant.id, 'explorer');
        await router.navigateByUrl(`/restaurant/${restaurant.id}`);
        return true;
      } catch {
        failed.set(placeId);
        return false;
      } finally {
        opening.set(null);
      }
    },
  };
}
