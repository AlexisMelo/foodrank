import { ComponentFixture, TestBed } from '@angular/core/testing';
import { query, stubDialogs, submitForm, textOf } from '@/testing/dom-testing';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let confirmed: ReturnType<typeof vi.fn<() => void>>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let opened: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(async () => {
    stubDialogs();
    confirmed = vi.fn();
    closed = vi.fn();
    opened = vi.fn();
    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.componentRef.setInput('heading', 'Remove from tierlist?');
    fixture.componentRef.setInput('message', 'Pizza Roma will be removed from Top 10.');
    fixture.componentRef.setInput('confirmLabel', 'Remove');
    fixture.componentRef.setInput('busyLabel', 'Removing…');
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.opened.subscribe(opened);
    await fixture.whenStable();
  });

  /**
   * The native dialog.
   */
  function dialog(): HTMLDialogElement {
    return query<HTMLDialogElement>(fixture, 'dialog');
  }

  /**
   * The confirm button.
   */
  function confirmButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(fixture, '.confirm-btn');
  }

  /**
   * Sets `name` to `value`, and waits for the popup to update.
   */
  async function set(
    name: 'busy' | 'canConfirm' | 'error',
    value: boolean | string,
  ): Promise<void> {
    fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  /**
   * Presses Esc in the popup: the browser fires a cancelable cancel event on the dialog.
   */
  function pressEscape(): Event {
    const event = new Event('cancel', { cancelable: true });
    dialog().dispatchEvent(event);
    return event;
  }

  it('opens as a modal labelled by its title, with its message, and tells it opened', () => {
    expect(dialog().open).toBe(true);
    const title = query(fixture, '.title');
    expect(textOf(title)).toBe('Remove from tierlist?');
    expect(dialog().getAttribute('aria-labelledby')).toBe(title.id);
    expect(textOf(query(fixture, '.text'))).toBe('Pizza Roma will be removed from Top 10.');
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('confirms from the confirm button or the Enter key', async () => {
    expect(textOf(confirmButton())).toBe('Remove');

    await submitForm(fixture);

    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(closed).not.toHaveBeenCalled();
  });

  it('cannot be confirmed before the parent allows it', async () => {
    await set('canConfirm', false);

    expect(confirmButton().disabled).toBe(true);
    await submitForm(fixture);
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('asks to be closed from Cancel, the Esc key and a click outside, not a click inside', async () => {
    query(fixture, '.cancel-btn').click();
    expect(closed).toHaveBeenCalledTimes(1);

    expect(pressEscape().defaultPrevented).toBe(true);
    expect(closed).toHaveBeenCalledTimes(2);

    dialog().click();
    expect(closed).toHaveBeenCalledTimes(3);

    query(fixture, '.dialog').click();
    expect(closed).toHaveBeenCalledTimes(3);
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('can be neither closed nor confirmed while the action runs, which its button says', async () => {
    await set('busy', true);

    expect(textOf(confirmButton())).toBe('Removing…');
    expect(confirmButton().disabled).toBe(true);
    expect(query<HTMLButtonElement>(fixture, '.cancel-btn').disabled).toBe(true);
    pressEscape();
    dialog().click();
    await submitForm(fixture);

    expect(closed).not.toHaveBeenCalled();
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('shows why the last try failed', async () => {
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();

    await set('error', "Couldn't remove the restaurant, try again.");

    const error = query(fixture, '.error');
    expect(textOf(error)).toBe("Couldn't remove the restaurant, try again.");
    expect(error.getAttribute('role')).toBe('alert');
  });
});
