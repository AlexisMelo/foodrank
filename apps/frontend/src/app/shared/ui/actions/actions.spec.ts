import { ComponentFixture, TestBed } from '@angular/core/testing';
import { query, queryAll, stubPopovers, textOf } from '@/testing/dom-testing';
import { type Action, Actions } from './actions';

describe('Actions', () => {
  let see: ReturnType<typeof vi.fn<() => void>>;
  let share: ReturnType<typeof vi.fn<() => void>>;
  let remove: ReturnType<typeof vi.fn<() => void>>;
  let fixture: ComponentFixture<Actions>;

  beforeEach(async () => {
    // The menu is a popover
    stubPopovers();
    see = vi.fn();
    share = vi.fn();
    remove = vi.fn();
    const actions: Action[] = [
      { label: 'See the restaurant', icon: '🍽️', run: see },
      { label: 'Share', icon: '📤', run: share },
      { label: 'Remove from tierlist', icon: '🗑️', danger: true, run: remove },
    ];
    fixture = TestBed.createComponent(Actions);
    fixture.componentRef.setInput('actions', actions);
    fixture.componentRef.setInput('label', 'Actions for Pizza Roma');
    await fixture.whenStable();
  });

  /**
   * The 3 dots button.
   */
  function button(): HTMLButtonElement {
    return query<HTMLButtonElement>(fixture, '.actions-btn');
  }

  /**
   * The menu of the actions.
   */
  function menu(): HTMLElement {
    return query(fixture, '[role="menu"]');
  }

  /**
   * True while the menu is shown.
   */
  function isOpen(): boolean {
    return menu().hasAttribute('data-popover-open');
  }

  /**
   * Label of the focused element, when it is an action of the menu; its tag otherwise.
   */
  function focused(): string {
    const element = document.activeElement!;
    return element.getAttribute('role') === 'menuitem'
      ? textOf(element.querySelector('.actions-item-label')!)
      : element.tagName;
  }

  /**
   * Clicks the 3 dots button, then waits for the menu to update.
   */
  async function clickButton(): Promise<void> {
    button().click();
    await fixture.whenStable();
  }

  /**
   * Presses `key` on the focused element, then waits for the menu to update.
   */
  async function press(key: string): Promise<void> {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  }

  it('shows a closed button, named after what its actions act on, which names its menu', () => {
    expect(button().getAttribute('aria-label')).toBe('Actions for Pizza Roma');
    expect(button().getAttribute('aria-haspopup')).toBe('menu');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBe(menu().id);
    expect(menu().getAttribute('aria-labelledby')).toBe(button().id);
    expect(isOpen()).toBe(false);
  });

  it('opens the menu of the actions on a click, the first one focused, the ones deleting in red', async () => {
    await clickButton();

    expect(isOpen()).toBe(true);
    expect(button().getAttribute('aria-expanded')).toBe('true');
    const items = queryAll(fixture, '[role="menuitem"]');
    expect(items.map((item) => textOf(item.querySelector('.actions-item-label')!))).toEqual([
      'See the restaurant',
      'Share',
      'Remove from tierlist',
    ]);
    expect(items.map((item) => item.classList.contains('actions-item-danger'))).toEqual([
      false,
      false,
      true,
    ]);
    expect(focused()).toBe('See the restaurant');
  });

  it('runs the action picked, once the menu is closed and the button focused back', async () => {
    await clickButton();

    let openWhenRun: boolean | undefined;
    share.mockImplementation(() => (openWhenRun = isOpen()));
    queryAll(fixture, '[role="menuitem"]')[1]!.click();
    await fixture.whenStable();

    expect(share).toHaveBeenCalledTimes(1);
    expect(openWhenRun).toBe(false);
    expect(see).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button());
  });

  it('moves between the actions with the arrows, wrapping around, and with Home and End', async () => {
    await clickButton();

    await press('ArrowDown');
    expect(focused()).toBe('Share');
    await press('ArrowDown');
    await press('ArrowDown');
    expect(focused()).toBe('See the restaurant');
    await press('ArrowUp');
    expect(focused()).toBe('Remove from tierlist');
    await press('Home');
    expect(focused()).toBe('See the restaurant');
    await press('End');
    expect(focused()).toBe('Remove from tierlist');
  });

  it('opens the menu from the button with the down arrow on the first action, the up arrow on the last one', async () => {
    button().focus();
    await press('ArrowDown');
    expect(isOpen()).toBe(true);
    expect(focused()).toBe('See the restaurant');

    await press('Escape');
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(button());

    await press('ArrowUp');
    expect(isOpen()).toBe(true);
    expect(focused()).toBe('Remove from tierlist');
  });

  it('closes with Tab, focusing the button back so the focus moves on from it', async () => {
    await clickButton();

    await press('Tab');

    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(button());
  });

  it('closes when its button is clicked again, or on a click outside, not on a click inside the menu', async () => {
    await clickButton();
    await clickButton();
    expect(isOpen()).toBe(false);

    await clickButton();
    menu().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(isOpen()).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(isOpen()).toBe(false);
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(see).not.toHaveBeenCalled();
  });
});
