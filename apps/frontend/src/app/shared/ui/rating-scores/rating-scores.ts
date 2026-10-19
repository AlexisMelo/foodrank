import { Component, computed, input } from '@angular/core';
import { scoreColor } from '@/core/utils/rating';

/**
 * The food, service and decor scores of a restaurant side by side, rounded and colored by value.
 */
@Component({
  imports: [],
  selector: 'app-rating-scores',
  styleUrl: './rating-scores.scss',
  templateUrl: './rating-scores.html',
})
export class RatingScores {
  /**
   * Food score, 0 to 100, decimals allowed (e.g. an average)
   */
  readonly food = input.required<number>();

  /**
   * Service score, 0 to 100, decimals allowed
   */
  readonly service = input.required<number>();

  /**
   * Decor (setting) score, 0 to 100, decimals allowed
   */
  readonly decor = input.required<number>();

  /**
   * One entry per criterion, in display order: its emoji, its rounded score and the color of the exact score
   */
  protected readonly scores = computed(() =>
    [
      { label: '🍽️', score: this.food() },
      { label: '🤝', score: this.service() },
      { label: '✨', score: this.decor() },
    ].map(({ label, score }) => ({ label, value: Math.round(score), color: scoreColor(score) })),
  );
}
