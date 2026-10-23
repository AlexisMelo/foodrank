import { Service, signal } from '@angular/core';

/**
 * What the restaurant page celebrates in a full page modal:
 * - `explorer`: the logged-in user is the first to open the place from the search, which has just stored it
 * - `first-review`: the logged-in user has just rated the restaurant for the first time
 */
export type CelebrationKind = 'explorer' | 'first-review';

/**
 * A celebration waiting for the restaurant page.
 */
export interface Celebration {
  /**
   * Database id of the restaurant celebrated
   */
  restaurantId: string;

  /**
   * What is celebrated
   */
  kind: CelebrationKind;
}

/**
 * The celebration handed from the page that triggered it (search, rating page) to the restaurant page, which shows it
 * until it is closed. Kept in memory only: it is not in the URL, so nobody else can open it, and a reload does not show
 * it again. A signal, because the restaurant page stays open when another restaurant is opened from its search: only
 * its id changes.
 */
@Service()
export class CelebrationStore {
  /**
   * The celebration waiting for the restaurant page; null when there is none
   */
  private readonly celebration = signal<Celebration | null>(null);

  /**
   * The celebration waiting for the restaurant page; null when there is none, and once its modal is closed
   */
  readonly pending = this.celebration.asReadonly();

  /**
   * Asks the page of `restaurantId` to celebrate `kind`
   */
  celebrate(restaurantId: string, kind: CelebrationKind): void {
    this.celebration.set({ restaurantId, kind });
  }

  /**
   * Forgets the celebration once its modal is closed, so it shows only once
   */
  dismiss(): void {
    this.celebration.set(null);
  }
}
