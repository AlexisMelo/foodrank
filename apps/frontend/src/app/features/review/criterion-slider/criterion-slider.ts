import { Component, computed, input } from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import {
  THRESHOLD_MARKERS,
  markerLeft,
  ratingLabel,
  sliderColor,
  sliderGradient,
} from '../rating-scale';

/**
 * A past review of the user shown under the slider, as a landmark.
 */
export interface ReviewMarker {
  /**
   * Id of the review
   */
  id: string;

  /**
   * Score the review gave to this criterion, 0 to 100
   */
  value: number;

  /**
   * Emoji of the restaurant reviewed
   */
  emoji: string;

  /**
   * Name of the restaurant reviewed
   */
  name: string;
}

/**
 * Card rating one criterion of the rating page: its title and question, a chip naming the score, and a 0 to 100
 * slider with the scale words and a few past reviews of the user under it.
 */
@Component({
  imports: [FormField],
  selector: 'app-criterion-slider',
  styleUrl: './criterion-slider.scss',
  templateUrl: './criterion-slider.html',
  host: { class: 'criterion-card' },
})
export class CriterionSlider {
  /**
   * Score of the criterion in the rating form, 0 to 100
   */
  readonly field = input.required<FieldTree<number>>();

  /**
   * Emoji of the criterion, e.g. "🍽️"
   */
  readonly icon = input.required<string>();

  /**
   * Name of the criterion, e.g. "Food"; also the accessible name of the slider
   */
  readonly criterion = input.required<string>();

  /**
   * Question under the name, e.g. "Did the food blow your mind?"
   */
  readonly question = input.required<string>();

  /**
   * Past reviews shown under the slider; empty when there is none close to the targets
   */
  readonly markers = input<ReviewMarker[]>([]);

  /**
   * Words of the scale marked under the slider, "Awful" (at 0) left out
   */
  protected readonly thresholds = THRESHOLD_MARKERS.slice(1);

  /**
   * Places a marker under the slider
   */
  protected readonly markerLeft = markerLeft;

  /**
   * Current score
   */
  private readonly value = computed(() => this.field()().value());

  /**
   * Color of the current score
   */
  protected readonly color = computed(() => sliderColor(this.value()));

  /**
   * Background of the score chip: the color of the current score at 20% opacity
   */
  protected readonly chipBackground = computed(() => sliderColor(this.value(), 0.2));

  /**
   * Border of the score chip: the color of the current score at 40% opacity
   */
  protected readonly chipBorder = computed(() => sliderColor(this.value(), 0.4));

  /**
   * Background of the slider track, filled up to the current score
   */
  protected readonly gradient = computed(() => sliderGradient(this.value()));

  /**
   * Word of the current score, e.g. "Good"
   */
  protected readonly label = computed(() => ratingLabel(this.value()));
}
