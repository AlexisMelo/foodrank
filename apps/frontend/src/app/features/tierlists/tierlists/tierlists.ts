import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TierlistApi } from '@/core/api/tierlist-api';
import { NewChip } from '@/shared/ui/new-chip/new-chip';
import { TierlistCard } from '../tierlist-card/tierlist-card';

/**
 * Order of the tierlists: most recently created, most recently updated, or by name
 */
type SortKey = 'recent' | 'az' | 'updated';

/**
 * Sort chips of the page, in display order
 */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently created' },
  { key: 'updated', label: 'Recently updated' },
  { key: 'az', label: 'A–Z' },
];

/**
 * Tierlists page (/tierlists): the logged-in user's tierlists, sorted as they choose, and a button to create one.
 */
@Component({
  imports: [NewChip, TierlistCard],
  selector: 'app-tierlists',
  styleUrl: './tierlists.scss',
  templateUrl: './tierlists.html',
})
export class Tierlists {
  /**
   * Opens the creation page
   */
  private readonly router = inject(Router);

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
   * Order chosen by the user, most recently created first by default
   */
  protected readonly sortBy = signal<SortKey>('recent');

  /**
   * Sort chips of the page, in display order
   */
  protected readonly sortOptions = SORT_OPTIONS;

  /**
   * The tierlists in the chosen order; empty while loading and when the API fails
   */
  protected readonly sortedTierlists = computed(() => {
    const list = [...(this.tierlistsResource.hasValue() ? this.tierlistsResource.value() : [])];
    const sortBy = this.sortBy();
    if (sortBy === 'recent') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === 'updated') {
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  });

  /**
   * Opens the creation page
   */
  protected createTierlist(): void {
    void this.router.navigateByUrl('/tierlists/new');
  }
}
