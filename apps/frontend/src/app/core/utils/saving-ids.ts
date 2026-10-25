import { signal } from '@angular/core';

/**
 * Ids of the rows of a list whose change is being saved, read as a signal: a row is disabled while its change is
 * saved, so the change is not sent twice. Used by the popups adding a restaurant to tierlists, or restaurants to a
 * tierlist.
 */
export class SavingIds<T> {
  /**
   * Ids of the rows being saved
   */
  private readonly ids = signal<ReadonlySet<T>>(new Set());

  /**
   * True while the change of the row `id` is being saved
   */
  has(id: T): boolean {
    return this.ids().has(id);
  }

  /**
   * Runs `save` for the row `id`, which is being saved until `save` ends, whether it succeeds or fails; does nothing
   * while a change of the same row is already being saved
   */
  async run(id: T, save: () => Promise<void>): Promise<void> {
    if (this.has(id)) return;
    this.ids.update((ids) => new Set(ids).add(id));
    try {
      await save();
    } finally {
      this.ids.update((ids) => {
        const remaining = new Set(ids);
        remaining.delete(id);
        return remaining;
      });
    }
  }
}
