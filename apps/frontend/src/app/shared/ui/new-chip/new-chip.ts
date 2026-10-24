import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LockIcon } from '../lock-icon/lock-icon';

/**
 * Small rounded "+ New" chip, next to a section title: a link when it opens a page, a button otherwise, and a disabled
 * button with a padlock while locked.
 */
@Component({
  imports: [LockIcon, NgTemplateOutlet, RouterLink],
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
