import { Component, computed, input } from '@angular/core';
import { scoreColor } from '@/core/utils/rating';

/**
 * Round badge showing the global rating of a restaurant, colored by value. Its position comes from the parent,
 * through a class set on the component.
 */
@Component({
  imports: [],
  selector: 'app-global-score-badge',
  styleUrl: './global-score-badge.scss',
  templateUrl: './global-score-badge.html',
})
export class GlobalScoreBadge {
  /**
   * Global rating, 0 to 100, decimals allowed (an average)
   */
  readonly score = input.required<number>();

  /**
   * Score shown in the badge, rounded
   */
  protected readonly rounded = computed(() => Math.round(this.score()));

  /**
   * Color of a 0-100 score
   */
  protected readonly scoreColor = scoreColor;
}
