import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RestaurantSuggestion } from '@/core/models/restaurant.model';
import { displayedName } from '@/core/utils/profile';
import { roundScore, scoreColor } from '@/core/utils/rating';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { ScorePipe } from '@/shared/pipes/score-pipe';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Most avatars of followed raters shown on a card; the others are only counted, e.g. "+2".
 */
const MAX_RATER_AVATARS = 3;

/**
 * A distance for display: "850 m" under 1 km, "2.3 km" above.
 */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Names joined as in a sentence, e.g. "Camille and Hugo", "Camille, Hugo, and Léa".
 */
const NAME_LIST = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/**
 * Card of a restaurant suggested on the Explore page, with the look of the review cards of the home and community pages:
 * the restaurant with its global score in the bubble ("?" when nobody rated it), its address where a review card shows
 * the date, then its distance where a review card shows the scores of the criteria. A chip of the avatars of the users
 * followed who rated it sits across its bottom border, without their names. Opens the restaurant page.
 */
@Component({
  imports: [DisplayedNamePipe, RouterLink, ScorePipe, UserAvatar],
  selector: 'app-suggestion-card',
  styleUrl: './suggestion-card.scss',
  templateUrl: './suggestion-card.html',
})
export class SuggestionCard {
  /**
   * Restaurant suggested, with its distance, its global score and the users followed who rated it
   */
  readonly suggestion = input.required<RestaurantSuggestion>();

  /**
   * Background of the bubble, the color of the global score rounded as displayed; null when nobody rated the
   * restaurant (a neutral bubble with "?")
   */
  protected readonly globalScoreColor = computed(() => {
    const score = this.suggestion().globalScore;
    return score === null ? null : scoreColor(roundScore(score));
  });

  /**
   * Distance shown, e.g. "850 m", "2.3 km"; null when the position of the user is unknown (no distance shown)
   */
  protected readonly distance = computed(() => {
    const km = this.suggestion().distanceKm;
    return km === null ? null : formatDistance(km);
  });

  /**
   * Followed raters whose avatar is shown, the most recent rating first: MAX_RATER_AVATARS at most
   */
  protected readonly shownRaters = computed(() =>
    this.suggestion().followedRaters.slice(0, MAX_RATER_AVATARS),
  );

  /**
   * Number of followed raters without their avatar on the chip, shown as "+2"; 0 when every one is shown
   */
  protected readonly hiddenRaterCount = computed(() =>
    Math.max(0, this.suggestion().followedRaters.length - MAX_RATER_AVATARS),
  );

  /**
   * Names of every followed rater, which the chip does not show: read by screen readers and shown on hover, e.g.
   * "Camille and Hugo ate here"
   */
  protected readonly ratersLabel = computed(
    () => `${NAME_LIST.format(this.suggestion().followedRaters.map(displayedName))} ate here`,
  );
}
