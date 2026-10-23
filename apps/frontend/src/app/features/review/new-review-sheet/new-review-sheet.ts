import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  linkedSignal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { map, of, switchMap, timer } from 'rxjs';
import { PLACE_SEARCH_MIN_LENGTH, RestaurantApi } from '@/core/api/restaurant-api';
import { UserLocation } from '@/core/location/user-location';
import type { PlaceSuggestion } from '@/core/models/restaurant.model';
import { injectOpenPlace } from '@/shared/data/open-place';
import { NewReviewStore } from '../new-review-store';
import { SearchAreaHint } from '../search-area-hint/search-area-hint';

/**
 * Time without typing before the suggestions are requested, in milliseconds
 */
const SEARCH_DEBOUNCE_MS = 500;

/**
 * Sheet sliding from the top to pick the restaurant to review: place suggestions while typing, or the full search
 * results on Enter. Opened by NewReviewStore, from the bottom tab bar or the "+ New" chips.
 */
@Component({
  imports: [FormField, SearchAreaHint],
  selector: 'app-new-review-sheet',
  styleUrl: './new-review-sheet.scss',
  templateUrl: './new-review-sheet.html',
})
export class NewReviewSheet {
  /**
   * Whether the sheet is open, and closes it
   */
  protected readonly newReview = inject(NewReviewStore);

  /**
   * Position of the user, sent with the search to favor nearby restaurants; asked for each time the sheet opens
   */
  private readonly userLocation = inject(UserLocation);

  /**
   * Requests the place suggestions
   */
  private readonly restaurantApi = inject(RestaurantApi);

  /**
   * Opens the search results page
   */
  private readonly router = inject(Router);

  /**
   * Opens the place picked, storing its restaurant on the first time
   */
  protected readonly places = injectOpenPlace();

  /**
   * The native dialog, shown as a modal once rendered; undefined while the sheet is closed
   */
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Search field, focused when the sheet opens; undefined while the sheet is closed
   */
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Text typed in the search field, emptied each time the sheet opens or closes
   */
  private readonly search = linkedSignal({
    source: this.newReview.isOpen,
    computation: () => ({ query: '' }),
  });

  /**
   * Search field, with no validation
   */
  protected readonly searchForm = form(this.search);

  /**
   * Query as typed, trimmed
   */
  private readonly trimmedQuery = computed(() => this.search().query.trim());

  /**
   * Query to search: the trimmed query once the user stopped typing for SEARCH_DEBOUNCE_MS, or '' right away when it
   * is shorter than PLACE_SEARCH_MIN_LENGTH. Typing back a query already searched does not search again
   */
  private readonly searchedQuery = toSignal(
    toObservable(this.trimmedQuery).pipe(
      switchMap((query) =>
        query.length < PLACE_SEARCH_MIN_LENGTH ? of('') : timer(SEARCH_DEBOUNCE_MS).pipe(map(() => query)),
      ),
    ),
    { initialValue: '' },
  );

  /**
   * Suggestions for searchedQuery, near the user's position when known; idle while there is no query to search, and
   * an outdated answer is ignored
   */
  private readonly suggestionsResource = rxResource({
    params: () => this.searchedQuery() || undefined,
    stream: ({ params: query }) =>
      this.restaurantApi.autocompletePlaces(query, this.userLocation.location()),
  });

  /**
   * True while the suggestions are requested (not while the user is typing)
   */
  protected readonly loading = this.suggestionsResource.isLoading;

  /**
   * True when the place search failed
   */
  protected readonly error = computed(() => this.suggestionsResource.status() === 'error');

  /**
   * Suggestions shown; empty while there is no query to search, while loading and when the search failed
   */
  protected readonly suggestions = computed<PlaceSuggestion[]>(() =>
    this.suggestionsResource.hasValue() ? this.suggestionsResource.value() : [],
  );

  /**
   * True when the search of the query as typed found nothing; false while the user is still typing (the query is
   * not searched yet), while loading and when the search failed
   */
  protected readonly noResults = computed(
    () =>
      this.searchedQuery() !== '' &&
      this.searchedQuery() === this.trimmedQuery() &&
      this.suggestionsResource.hasValue() &&
      this.suggestionsResource.value().length === 0,
  );

  constructor() {
    // Asks for the position each time the sheet opens, so the search favors nearby restaurants
    effect(() => {
      if (this.newReview.isOpen()) untracked(() => this.userLocation.requestLocation());
    });
    // Shows the dialog as a modal (top layer, Esc key, focus kept inside) once rendered, then focuses the search field
    afterRenderEffect({
      write: () => {
        const dialog = this.dialog()?.nativeElement;
        if (!dialog || dialog.open) return;
        dialog.showModal();
        this.searchInput()?.nativeElement.focus();
      },
    });
  }

  /**
   * Opens the full search results of the query, unless it is empty
   */
  protected submitSearch(event: Event): void {
    event.preventDefault();
    const trimmed = this.trimmedQuery();
    if (!trimmed) return;
    this.newReview.close();
    void this.router.navigate(['/search'], { queryParams: { q: trimmed } });
  }

  /**
   * Opens the restaurant page of the place, storing it on the first time, then closes; stays open on failure, with the
   * error shown
   */
  protected async selectPlace(place: PlaceSuggestion): Promise<void> {
    if (await this.places.open(place.placeId)) this.newReview.close();
  }

  /**
   * Esc key: closes through the store instead of the browser, so the sheet plays its closing animation
   */
  protected cancel(event: Event): void {
    event.preventDefault();
    this.newReview.close();
  }

  /**
   * Closes the sheet on a click on the dark overlay around it, not inside it
   */
  protected closeOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.newReview.close();
  }
}
