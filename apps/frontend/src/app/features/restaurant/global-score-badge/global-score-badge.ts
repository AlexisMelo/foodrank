import { Component, computed, input } from '@angular/core';
import { roundScore, scoreColor } from '@/core/utils/rating';
import { ScorePipe } from '@/shared/pipes/score-pipe';

/**
 * Round badge showing the global rating of a restaurant, colored by value. Its position comes from the parent,
 * through a class set on the component.
 */
@Component({
  imports: [ScorePipe],
  selector: 'app-global-score-badge',
  styleUrl: './global-score-badge.scss',
  templateUrl: './global-score-badge.html',
})
export class GlobalScoreBadge {
  /**
   * Global rating, 1 to 10, decimals allowed (an average)
   */
  readonly score = input.required<number>();

  /**
   * Score rounded to one decimal, as the score pipe shows it: the badge is colored by it, so the color matches the
   * number shown (8.46 is shown 8.5, green)
   */
  protected readonly rounded = computed(() => roundScore(this.score()));

  /**
   * Color of a 1-10 score
   */
  protected readonly scoreColor = scoreColor;
}
