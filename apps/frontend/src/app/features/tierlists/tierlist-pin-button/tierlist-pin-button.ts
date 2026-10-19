import { Component, input, output } from '@angular/core';

/**
 * Button pinning a tierlist to its owner's profile, or unpinning it. Shows the state it is given: the parent saves
 * the change and passes the saved state back.
 */
@Component({
  imports: [],
  selector: 'app-tierlist-pin-button',
  styleUrl: './tierlist-pin-button.scss',
  templateUrl: './tierlist-pin-button.html',
})
export class TierlistPinButton {
  /**
   * Pinned to its owner's profile
   */
  readonly pinned = input.required<boolean>();

  /**
   * A change is being saved: the button is disabled meanwhile
   */
  readonly saving = input(false);

  /**
   * The user asks to pin, or unpin, the tierlist (named toggle in the Vue app; renamed so it does not clash with the
   * native toggle event)
   */
  readonly pinToggle = output<void>();
}
