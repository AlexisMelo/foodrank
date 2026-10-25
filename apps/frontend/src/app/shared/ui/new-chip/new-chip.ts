import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LockIcon } from '../lock-icon/lock-icon';

/**
 * Small rounded "+ New" chip (or "+ Add", ...), next to a section title or a count: a link when it opens a page, a
 * button otherwise, and a disabled button with a padlock while locked.
 */
@Component({
  imports: [LockIcon, NgTemplateOutlet, RouterLink],
  selector: 'app-new-chip',
  styleUrl: './new-chip.scss',
  templateUrl: './new-chip.html',
})
export class NewChip {
  /**
   * Text after the "+", e.g. "Add"
   */
  readonly label = input('New');

  /**
   * Accessible name when the label alone is not explicit enough, e.g. "Add restaurants to Date night"; undefined to
   * use the label
   */
  readonly ariaLabel = input<string>();

  /**
   * Route the chip links to, e.g. /tierlists/new; undefined for a button emitting pressed instead
   */
  readonly link = input<string>();

  /**
   * True to show the chip locked: a disabled button with a padlock, neither linking nor emitting pressed
   */
  readonly locked = input(false);

  /**
   * Why the chip is locked, shown as its tooltip; undefined for no tooltip
   */
  readonly lockedReason = input<string>();

  /**
   * The button is clicked, when there is no link (not named click, so it does not clash with the native click event)
   */
  readonly pressed = output<void>();
}
