import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { SearchArea } from '@/core/models/restaurant.model';

/**
 * Line under the search field telling around which city the results are, with the button enabling the location.
 */
@Component({
  selector: 'app-search-area-hint',
  styleUrl: './search-area-hint.scss',
  templateUrl: './search-area-hint.html',
})
export class SearchAreaHint {
  /**
   * Position of the user and where its request stands; the button asks for it again
   */
  protected readonly userLocation = inject(UserLocation);

  /**
   * Reads the city searches are centered on
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * City of the current position (the default city while it is unknown), reloaded on each position change; a late
   * answer for a previous position is ignored
   */
  private readonly areaResource = rxResource({
    params: () => ({ location: this.userLocation.location() }),
    stream: ({ params }) => this.restaurantApi.fetchSearchArea(params.location),
  });

  /**
   * City searches are centered on; null until the first answer and when the API fails. The previous city stays
   * until the one of a new position is known, as in the Vue app
   */
  private readonly area = linkedSignal<SearchArea | null | undefined, SearchArea | null>({
    // undefined while loading
    source: () => {
      if (this.areaResource.isLoading()) return undefined;
      return this.areaResource.hasValue() ? this.areaResource.value() : null;
    },
    computation: (loaded, previous) => (loaded === undefined ? (previous?.value ?? null) : loaded),
  });

  /**
   * "Around Lyon", "Around you" when the city is unknown, or null if nothing to show
   */
  protected readonly areaLabel = computed(() => {
    const granted = this.userLocation.status() === 'granted';
    const area = this.area();
    // While the user's city is loading, don't keep showing the default one
    if (area?.locality && !(granted && area.isDefault)) return `Around ${area.locality}`;
    return granted ? 'Around you' : null;
  });

  /**
   * The user can be asked again (never asked, prompt dismissed, or position not obtained)
   */
  protected readonly canAsk = computed(() =>
    ['idle', 'dismissed', 'unavailable'].includes(this.userLocation.status()),
  );
}
