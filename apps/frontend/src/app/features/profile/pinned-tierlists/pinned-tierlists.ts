import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TierlistApi } from '@/core/api/tierlist-api';
import { TierlistChip } from '@/shared/ui/tierlist-chip/tierlist-chip';

/**
 * Row of the tierlists a user pinned to their profile; hidden when there is none.
 */
@Component({
  imports: [TierlistChip],
  selector: 'app-pinned-tierlists',
  styleUrl: './pinned-tierlists.scss',
  templateUrl: './pinned-tierlists.html',
})
export class PinnedTierlists {
  /**
   * Id of the user whose pinned tierlists are shown
   */
  readonly userId = input.required<string>();

  /**
   * Reads the user's tierlists
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * The user's pinned tierlists, reloaded when the user changes
   */
  private readonly pinnedResource = rxResource({
    params: () => this.userId(),
    stream: ({ params: userId }) => this.tierlistApi.fetchPinnedTierlistsByUserId(userId),
  });

  /**
   * Pinned tierlists, most recently created first; empty while loading and when the API fails: a secondary section
   * of the profile is hidden rather than failing the page
   */
  protected readonly pinned = computed(() =>
    this.pinnedResource.hasValue() ? this.pinnedResource.value() : [],
  );
}
