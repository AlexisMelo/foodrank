import { Component, computed, input } from '@angular/core';
import type { RatingSummary } from '@/core/models/rating.model';
import { scoreColor } from '@/core/utils/rating';

/**
 * Average of each criterion of a restaurant (food, service, decor), rounded to a whole number and colored by value,
 * and the number of ratings averaged. Its size comes from the parent, through a class set on the component.
 */
@Component({
  imports: [],
  selector: 'app-criteria-averages',
  styleUrl: './criteria-averages.scss',
  templateUrl: './criteria-averages.html',
})
export class CriteriaAverages {
  /**
   * Averages of the restaurant's active ratings
   */
  readonly summary = input.required<RatingSummary>();

  /**
   * One entry per criterion, in display order: its label and its average rounded to a whole number, like the criteria
   * of a rating (0 when nobody rated it, never shown: the template shows "No ratings yet" instead)
   */
  protected readonly criteria = computed(() => {
    const summary = this.summary();
    return [
      { label: '🍽️ Food', score: Math.round(summary.food ?? 0) },
      { label: '🤝 Service', score: Math.round(summary.service ?? 0) },
      { label: '✨ Decor', score: Math.round(summary.setting ?? 0) },
    ];
  });

  /**
   * Number of ratings averaged, e.g. "1 rating", "3 ratings"
   */
  protected readonly countLabel = computed(() => {
    const count = this.summary().count;
    return count === 1 ? '1 rating' : `${count} ratings`;
  });

  /**
   * Color of a 1-10 score
   */
  protected readonly scoreColor = scoreColor;
}
