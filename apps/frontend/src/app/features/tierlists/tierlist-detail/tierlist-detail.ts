import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';
import { RatingApi } from '@/core/api/rating-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { ME, UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { UserRating } from '@/core/models/rating.model';
import type { Tierlist } from '@/core/models/tierlist.model';
import type { UserProfile } from '@/core/models/user.model';
import { restaurantCountLabel } from '@/core/utils/profile';
import {
  type RankedRestaurant,
  overallByRestaurant,
  rankTierlistRestaurants,
} from '@/core/utils/ranking';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog';
import { NewChip } from '@/shared/ui/new-chip/new-chip';
import { RankedRestaurantItem } from '@/shared/ui/ranked-restaurant-item/ranked-restaurant-item';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';
import { AddRestaurantsDialog } from '../add-restaurants-dialog/add-restaurants-dialog';
import { TierlistPinButton } from '../tierlist-pin-button/tierlist-pin-button';

/**
 * What the tierlist page shows, loaded together once the tierlist is found.
 */
interface TierlistPage {
  /**
   * The tierlist; replaced by the saved one after a change of its pin
   */
  tierlist: Tierlist;

  /**
   * Profile of the tierlist's owner; null when the API does not know them
   */
  owner: UserProfile | null;

  /**
   * Every rating of the owner, which ranks the restaurants of the tierlist, and lists the restaurants the owner can add
   */
  ownerRatings: UserRating[];

  /**
   * Every rating of the logged-in user, which gives their own score on someone else's tierlist; the owner's ratings
   * when the logged-in user owns the tierlist
   */
  myRatings: UserRating[];
}

/**
 * Tierlist page (/tierlists/:id), of any user: the tierlist, its owner and its restaurants ranked by the owner's
 * ratings. Its owner can pin it to their profile, add the restaurants they rated from a popup, and remove its
 * restaurants after confirming. On someone else's tierlist, the restaurants I never rated have a "+" opening their
 * rating page, as on someone else's profile.
 */
@Component({
  imports: [
    AddRestaurantsDialog,
    ConfirmDialog,
    NewChip,
    RankedRestaurantItem,
    RouterLink,
    TierlistPinButton,
    UserAvatar,
  ],
  selector: 'app-tierlist-detail',
  styleUrl: './tierlist-detail.scss',
  templateUrl: './tierlist-detail.html',
})
export class TierlistDetail {
  /**
   * Id of the tierlist, from /tierlists/:id
   */
  readonly id = input.required<string>();

  /**
   * Leaves for the tierlists page when the tierlist does not exist
   */
  private readonly router = inject(Router);

  /**
   * Reads the tierlist and saves its pin
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Tells who is logged in, to know whether they own the tierlist (pin, ratings requested once)
   */
  private readonly auth = inject(AuthStore);

  /**
   * Reads the profile of the owner
   */
  private readonly userApi = inject(UserApi);

  /**
   * Reads the ratings of the owner and of the logged-in user
   */
  private readonly ratingApi = inject(RatingApi);

  /**
   * The page data, reloaded when the id changes; undefined while loading and for an unknown tierlist
   */
  private readonly pageResource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.loadPage(id),
  });

  /**
   * The page data once loaded; undefined while loading, for an unknown tierlist, and when the API fails
   */
  protected readonly page = computed(() =>
    this.pageResource.hasValue() ? this.pageResource.value() : undefined,
  );

  /**
   * True when the page could not be loaded (e.g. the API is unavailable): an error replaces the loader
   */
  protected readonly loadError = computed(() => this.pageResource.status() === 'error');

  /**
   * True when the logged-in user owns the tierlist: they can pin it, add restaurants to it and remove them
   */
  protected readonly isOwner = computed(
    () => this.page()?.tierlist.userId === this.auth.loggedInUserId(),
  );

  /**
   * True while a change of the pin is being saved
   */
  protected readonly pinSaving = signal(false);

  /**
   * True when the last change of the pin failed
   */
  protected readonly pinError = signal(false);

  /**
   * Restaurants of the tierlist, best first by the owner's scores; on someone else's tierlist, with my own score
   * (undefined when I never rated it)
   */
  protected readonly rankedRestaurants = computed(() => {
    const page = this.page();
    if (!page) return [];
    const isOwner = this.isOwner();
    const myScores = overallByRestaurant(page.myRatings);
    return rankTierlistRestaurants(
      page.tierlist.restaurants.map((e) => e.restaurantId),
      page.ownerRatings,
    ).map((r) => ({ ...r, myScore: isOwner ? undefined : myScores.get(r.restaurantId) }));
  });

  /**
   * Label of the number of restaurants: "1 restaurant", "3 restaurants"
   */
  protected readonly restaurantCountLabel = restaurantCountLabel;

  /**
   * True while the popup adding restaurants to the tierlist is open, for its owner
   */
  protected readonly addDialogOpen = signal(false);

  /**
   * The restaurant the owner asked to remove, shown in the confirmation popup; null while it is closed
   */
  protected readonly pendingRemoval = signal<RankedRestaurant | null>(null);

  /**
   * Text of the confirmation popup: what is removed from where; empty while it is closed
   */
  protected readonly removalMessage = computed(() => {
    const restaurant = this.pendingRemoval();
    const tierlist = this.page()?.tierlist;
    return restaurant && tierlist
      ? `${restaurant.name} will be removed from ${tierlist.name}. You can add it again from its page.`
      : '';
  });

  /**
   * True while the removal is being saved: the confirmation popup cannot be closed
   */
  protected readonly removing = signal(false);

  /**
   * Why the last removal failed, shown in the confirmation popup; empty when it did not
   */
  protected readonly removeError = signal('');

  /**
   * Loads the tierlist, then its owner and the ratings of the owner and of the logged-in user; the owner's ratings are
   * requested once when the logged-in user owns the tierlist. Leaves for the tierlists page when the tierlist does not
   * exist.
   */
  private loadPage(id: string): Observable<TierlistPage | undefined> {
    return this.tierlistApi.fetchTierlistById(id).pipe(
      switchMap((found) => {
        if (!found) {
          void this.router.navigateByUrl('/tierlists', { replaceUrl: true });
          return of(undefined);
        }
        const ownedByMe = found.userId === this.auth.loggedInUserId();
        return forkJoin({
          owner: this.userApi.fetchUserProfile(found.userId),
          ownerRatings: this.ratingApi.fetchUserRatings(found.userId),
          // My ratings are the owner's on my own tierlist
          myRatings: ownedByMe ? of(undefined) : this.ratingApi.fetchUserRatings(ME),
        }).pipe(
          map(({ owner, ownerRatings, myRatings }) => ({
            tierlist: found,
            owner: owner ?? null,
            ownerRatings,
            myRatings: myRatings ?? ownerRatings,
          })),
        );
      }),
    );
  }

  /**
   * Shows `tierlist` in place of the one loaded: saved by the API, or with the restaurants added from the popup
   */
  protected showTierlist(tierlist: Tierlist): void {
    this.pageResource.value.update((page) => page && { ...page, tierlist });
  }

  /**
   * Pins the tierlist, or unpins it. Saved through the API, so the pin shows on the profile; the button shows the
   * saved state, unchanged on failure
   */
  protected async togglePin(): Promise<void> {
    const tierlist = this.page()?.tierlist;
    if (!tierlist || this.pinSaving()) return;
    this.pinSaving.set(true);
    this.pinError.set(false);
    try {
      const saved = await firstValueFrom(
        this.tierlistApi.setTierlistPinned(tierlist.id, !tierlist.pinned),
      );
      this.showTierlist(saved);
    } catch {
      this.pinError.set(true);
    } finally {
      this.pinSaving.set(false);
    }
  }

  /**
   * Asks the owner to confirm the removal of `restaurant` from the tierlist
   */
  protected askRemoval(restaurant: RankedRestaurant): void {
    this.removeError.set('');
    this.pendingRemoval.set(restaurant);
  }

  /**
   * Closes the confirmation popup, the restaurant kept
   */
  protected cancelRemoval(): void {
    this.pendingRemoval.set(null);
  }

  /**
   * Removes the restaurant confirmed from the tierlist, through the API, then closes the popup and shows the tierlist
   * saved; on failure, the popup stays open and says it
   */
  protected async confirmRemoval(): Promise<void> {
    const tierlist = this.page()?.tierlist;
    const restaurant = this.pendingRemoval();
    if (!tierlist || !restaurant || this.removing()) return;
    this.removing.set(true);
    this.removeError.set('');
    try {
      const saved = await firstValueFrom(
        this.tierlistApi.removeRestaurantFromTierlist(tierlist.id, restaurant.restaurantId),
      );
      this.showTierlist(saved);
      this.pendingRemoval.set(null);
    } catch {
      this.removeError.set("Couldn't remove the restaurant, try again.");
    } finally {
      this.removing.set(false);
    }
  }
}
