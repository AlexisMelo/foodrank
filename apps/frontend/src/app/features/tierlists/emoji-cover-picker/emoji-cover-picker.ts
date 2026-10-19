import { Component, input, model, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * Cover of a tierlist, as a big emoji: a click opens a grid of emojis to pick another one. A value control of Signal
 * Forms: bind it with [formField] to a string field, or with [(value)].
 */
@Component({
  imports: [],
  selector: 'app-emoji-cover-picker',
  styleUrl: './emoji-cover-picker.scss',
  templateUrl: './emoji-cover-picker.html',
  // Esc closes the emojis, wherever the focus is in the picker
  host: { '(keydown.escape)': 'isOpen.set(false)' },
})
export class EmojiCoverPicker implements FormValueControl<string> {
  /**
   * Emoji displayed as the cover
   */
  readonly value = model.required<string>();

  /**
   * Emojis the user can pick from
   */
  readonly options = input.required<readonly string[]>();

  /**
   * True while the grid of emojis is open
   */
  protected readonly isOpen = signal(false);

  /**
   * Use the picked emoji as the cover, then close the grid
   */
  protected pick(option: string): void {
    this.value.set(option);
    this.isOpen.set(false);
  }
}
