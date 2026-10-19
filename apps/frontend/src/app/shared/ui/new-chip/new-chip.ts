import { Component, output } from '@angular/core';

/**
 * Small rounded "+ New" button, next to a section title.
 */
@Component({
  imports: [],
  selector: 'app-new-chip',
  styleUrl: './new-chip.scss',
  templateUrl: './new-chip.html',
})
export class NewChip {
  /**
   * The button is clicked (not named click, so it does not clash with the native click event)
   */
  readonly pressed = output<void>();
}
