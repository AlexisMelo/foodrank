import {
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

/**
 * Number given to the next menu created, so each button anchors and labels its own menu
 */
let nextMenuNumber = 1;

/**
 * An action offered by the menu of an `app-actions` button.
 */
export interface Action {
  /**
   * Text of the action in the menu, e.g. "Remove from tierlist"
   */
  label: string;

  /**
   * Emoji shown before the label, decorative
   */
  icon: string;

  /**
   * True for an action that deletes something: shown in red
   */
  danger?: boolean;

  /**
   * Runs when the user picks the action, once the menu is closed
   */
  run: () => void;
}

/**
 * Narrow button of 3 vertical dots opening a menu of the actions given, e.g. on each restaurant of a tierlist. A light
 * gray rounded rectangle shows behind the dots on hover and while the menu is open. The menu
 * opens under the button (above it when there is no room below), on top of the page; picking an action closes it,
 * then runs the action. A click outside, Esc and Tab close it too. Keyboard as the WAI-ARIA menu button: arrows,
 * Home and End move between the actions, the down and up arrows on the button open the menu on the first or last one.
 */
@Component({
  selector: 'app-actions',
  styleUrl: './actions.scss',
  templateUrl: './actions.html',
  host: {
    '(document:pointerdown)': 'closeOnPointerOutside($event)',
  },
})
export class Actions {
  /**
   * Actions offered, in the order of the menu
   */
  readonly actions = input.required<readonly Action[]>();

  /**
   * Accessible name of the button, and of its menu: what the actions act on, e.g. "Actions for Pizza Roma"
   */
  readonly label = input.required<string>();

  /**
   * Id of the button, labelling the menu
   */
  protected readonly buttonId = `actions-button-${nextMenuNumber}`;

  /**
   * Id of the menu, controlled by the button
   */
  protected readonly menuId = `actions-menu-${nextMenuNumber}`;

  /**
   * Name of the button as a CSS anchor, which places the menu next to it
   */
  protected readonly anchorName = `--actions-${nextMenuNumber++}`;

  /**
   * True while the menu is open
   */
  protected readonly open = signal(false);

  /**
   * The host element, holding the button and the menu: a click inside it does not close the menu
   */
  private readonly host = inject(ElementRef<HTMLElement>);

  /**
   * The 3 dots button, focused again once the menu closes
   */
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  /**
   * The menu, a popover shown on top of the page (no parent `overflow: hidden` cuts it)
   */
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  /**
   * The buttons of the actions, in the order of the menu
   */
  private readonly items = viewChildren<ElementRef<HTMLButtonElement>>('item');

  /**
   * Opens the menu on its first action, or closes it when it is open
   */
  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.show(0);
  }

  /**
   * Opens the menu from the keyboard: on the first action with the down arrow, on the last one with the up arrow
   */
  protected onButtonKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.show(event.key === 'ArrowDown' ? 0 : this.items().length - 1);
  }

  /**
   * Moves between the actions with the arrows (wrapping around), Home and End; closes the menu with Esc, and with Tab,
   * the focus then moving on from the button
   */
  protected onMenuKeydown(event: KeyboardEvent): void {
    const count = this.items().length;
    const current = this.items().findIndex((item) => item.nativeElement === event.target);
    switch (event.key) {
      case 'ArrowDown':
        this.focusItem((current + 1) % count);
        break;
      case 'ArrowUp':
        this.focusItem((current - 1 + count) % count);
        break;
      case 'Home':
        this.focusItem(0);
        break;
      case 'End':
        this.focusItem(count - 1);
        break;
      case 'Escape':
        this.close(true);
        break;
      case 'Tab':
        // Not prevented: the browser moves the focus on from the button, focused back
        this.close(true);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Closes the menu, focusing the button back, then runs `action`
   */
  protected pick(action: Action): void {
    this.close(true);
    action.run();
  }

  /**
   * Closes the menu when the user presses outside the button and the menu (the button toggles it itself)
   */
  protected closeOnPointerOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }

  /**
   * Opens the menu, focusing the action at `index`
   */
  private show(index: number): void {
    if (!this.open()) {
      this.open.set(true);
      this.menu().nativeElement.showPopover();
    }
    this.focusItem(index);
  }

  /**
   * Closes the menu; focuses the button back when `focusButton` is true (not on a click elsewhere, which moves the
   * focus itself)
   */
  private close(focusButton: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.menu().nativeElement.hidePopover();
    if (focusButton) this.button().nativeElement.focus();
  }

  /**
   * Focuses the action at `index`
   */
  private focusItem(index: number): void {
    this.items()[index]?.nativeElement.focus();
  }
}
