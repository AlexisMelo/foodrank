import { Component, computed, inject } from '@angular/core';
import { LocationStore } from '@/core/location/location-store';

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
   * City searches are centered on and where the location request stands; the button asks for the location again
   */
  protected readonly locationStore = inject(LocationStore);

  /**
   * The user can be asked again (never asked, prompt dismissed, or position not obtained)
   */
  protected readonly canAsk = computed(() =>
    ['idle', 'dismissed', 'unavailable'].includes(this.locationStore.status()),
  );
}
