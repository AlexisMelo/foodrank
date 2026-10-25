import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TierlistApi } from '@/core/api/tierlist-api';
import { byLastUpdate, byRestaurantCount } from '@/core/utils/tierlist';
import { NewChip } from '@/shared/ui/new-chip/new-chip';
import { type SortOption, SortChips } from '@/shared/ui/sort-chips/sort-chips';
import { TierlistCard } from '../tierlist-card/tierlist-card';

/**
 * Order of the tierlists: most recently updated, most restaurants, or by name
 */
type SortKey = 'updated' | 'count' | 'az';

/**
 * Sort chips of the page, in display order
 */
const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'updated', label: 'Recently updated' },
  { key: 'count', label: 'Number of restaurants' },
  { key: 'az', label: 'A–Z' },
];

/**
 * Tierlists page (/tierlists): the logged-in user's tierlists, sorted as they choose, and a link to create one.
 */
@Component({
  imports: [NewChip, SortChips, TierlistCard],
  selector: 'app-tierlists',
  styleUrl: './tierlists.scss',
  templateUrl: './tierlists.html',
})
export class Tierlists {
  /**
   * Reads the logged-in user's tierlists
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * The logged-in user's tierlists. Loaded on each visit, so a tierlist just created is listed when coming back from
   * the creation page
   */
  private readonly tierlistsResource = rxResource({
    stream: () => this.tierlistApi.fetchTierlistsByUserId(),
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
   * Order chosen by the user, most recently updated first by default
   */
  protected readonly sortBy = signal<SortKey>('updated');

  /**
   * Sort chips of the page, in display order
   */
  protected readonly sortOptions = SORT_OPTIONS;

  /**
   * The tierlists in the chosen order; empty while loading and when the API fails
   */
  protected readonly sortedTierlists = computed(() => {
    const list = this.tierlistsResource.hasValue() ? this.tierlistsResource.value() : [];
    const sortBy = this.sortBy();
    if (sortBy === 'updated') return byLastUpdate(list);
    if (sortBy === 'count') return byRestaurantCount(list);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });
}
