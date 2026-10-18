import { Component, input } from '@angular/core';

/**
 * Rounded chip showing the type of cuisine of a restaurant.
 */
@Component({
  imports: [],
  selector: 'app-cuisine-chip',
  styleUrl: './cuisine-chip.scss',
  templateUrl: './cuisine-chip.html',
})
export class CuisineChip {
  /**
   * Type of cuisine, e.g. "Italian"
   */
  readonly cuisine = input.required<string>();
}
