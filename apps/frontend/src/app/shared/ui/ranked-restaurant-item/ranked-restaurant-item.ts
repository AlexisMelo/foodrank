import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { roundScore, scoreColor } from '@/core/utils/rating';
import { ScorePipe } from '@/shared/pipes/score-pipe';
import { type Action, Actions } from '../actions/actions';
import { RatingScores } from '../rating-scores/rating-scores';

/**
 * A restaurant of a ranking (favorites, profile, tierlist): its address under its name, its criteria scores, its
 * overall score and, optionally, the logged-in user's own score in a small bubble on it ("?" when they did not rate
 * it), and a menu of actions at the right of the score. Opens the restaurant page.
 */
@Component({
  imports: [Actions, RouterLink, RatingScores, ScorePipe],
  selector: 'app-ranked-restaurant-item',
  styleUrl: './ranked-restaurant-item.scss',
  templateUrl: './ranked-restaurant-item.html',
})
export class RankedRestaurantItem {
  /**
   * Database id of the restaurant, used in /restaurant/:id
   */
  readonly restaurantId = input.required<string>();

  /**
   * Emoji of the restaurant
   */
  readonly emoji = input.required<string>();

  /**
   * Name of the restaurant
   */
  readonly name = input.required<string>();

  /**
   * Postal address, shown under the name; empty when unknown, for no line under the name
   */
  readonly address = input.required<string>();

  /**
   * Food score, whole number from 1 to 10
   */
  readonly food = input.required<number>();

  /**
   * Service score, whole number from 1 to 10
   */
  readonly service = input.required<number>();

  /**
   * Decor (setting) score, whole number from 1 to 10
   */
  readonly decor = input.required<number>();

  /**
   * Overall score, 1 to 10, decimals allowed (an average); shown rounded to one decimal in the colored bubble
   */
  readonly overall = input.required<number>();

  /**
   * The logged-in user's own score, 1 to 10, decimals allowed (an average), shown rounded to one decimal in a small
   * bubble; undefined when they did not rate it
   */
  readonly myScore = input<number>();

  /**
   * True to show a "?" in the small bubble when there is no myScore, as the restaurants nobody rated in Explore: on
   * someone else's ranking, the restaurants the logged-in user did not rate. False for no bubble without myScore
   */
  readonly showUnrated = input(false);

  /**
   * Actions of the 3 dots menu at the right of the score (e.g. remove the restaurant from a tierlist); empty for no
   * menu
   */
  readonly actions = input<readonly Action[]>([]);

  /**
   * Overall score rounded to one decimal, shown and colored in the bubble
   */
  protected readonly roundedOverall = computed(() => roundScore(this.overall()));

  /**
   * The user's score rounded to one decimal; only shown when myScore is defined
   */
  protected readonly roundedMyScore = computed(() => roundScore(this.myScore() ?? 0));

  /**
   * Color of a rounded 1-10 score
   */
  protected readonly scoreColor = scoreColor;
}
