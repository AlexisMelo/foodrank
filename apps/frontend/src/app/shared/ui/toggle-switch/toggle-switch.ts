import { Component, input, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

/**
 * On / off switch with a label and an optional hint, in a card. A checkbox control of Signal Forms: bind it with
 * [formField] to a boolean field, or with [(checked)].
 */
@Component({
  imports: [],
  selector: 'app-toggle-switch',
  styleUrl: './toggle-switch.scss',
  templateUrl: './toggle-switch.html',
})
export class ToggleSwitch implements FormCheckboxControl {
  /**
   * On / off state (defineModel in the Vue app)
   */
  readonly checked = model.required<boolean>();

  /**
   * What the switch turns on; also its accessible name
   */
  readonly label = input.required<string>();

  /**
   * Explanation under the label; none when undefined
   */
  readonly hint = input<string>();

  /**
   * Copies the state of the native checkbox once the user toggles it
   */
  protected onChange(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
