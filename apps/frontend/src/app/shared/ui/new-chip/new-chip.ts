import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Small rounded "+ New" chip, next to a section title: a link when it opens a page, a button otherwise.
 */
@Component({
  imports: [NgTemplateOutlet, RouterLink],
  selector: 'app-new-chip',
  styleUrl: './new-chip.scss',
  templateUrl: './new-chip.html',
})
export class NewChip {
  /**
   * Route the chip links to, e.g. /tierlists/new; undefined for a button emitting pressed instead
   */
  readonly link = input<string>();

  /**
   * The button is clicked, when there is no link (not named click, so it does not clash with the native click event)
   */
  readonly pressed = output<void>();
}
