import type { ComponentFixture } from '@angular/core/testing';

// Test helpers acting on the rendered page like a user, then waiting for the page to update ("act, wait, assert")

/**
 * The element matching `selector`; fails the test when there is none.
 */
export function query<T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T {
  const element = (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
  if (!element) throw new Error(`No element matches ${selector}`);
  return element;
}

/**
 * Every element matching `selector`.
 */
export function queryAll<T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<T>(selector));
}

/**
 * Text of `element`, trimmed, its whitespace collapsed.
 */
export function textOf(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Types `value` in the field (input or select) matching `selector`.
 */
export async function typeIn(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): Promise<void> {
  await setValue(fixture, query<HTMLInputElement | HTMLSelectElement>(fixture, selector), value);
}

/**
 * Sets `value` in the field (input, range or select) `field`, as the user would.
 */
export async function setValue(
  fixture: ComponentFixture<unknown>,
  field: HTMLInputElement | HTMLSelectElement,
  value: string,
): Promise<void> {
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form matching `selector` (the only form by default), as the Enter key or a submit button would.
 */
export async function submitForm(
  fixture: ComponentFixture<unknown>,
  selector = 'form',
): Promise<void> {
  query(fixture, selector).dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
}

/**
 * Clicks the button whose text is `label`.
 */
export async function clickButton(
  fixture: ComponentFixture<unknown>,
  label: string,
): Promise<void> {
  const button = queryAll<HTMLButtonElement>(fixture, 'button').find((b) => textOf(b) === label);
  if (!button) throw new Error(`No button labelled ${label}`);
  button.click();
  await fixture.whenStable();
}

/**
 * jsdom has no showModal() nor close() on <dialog>: adds minimal ones that only toggle `open` (close() also fires
 * the close event), so components using a native dialog can be tested. No-op once the browser has them.
 */
export function stubDialogs(): void {
  const dialog = HTMLDialogElement.prototype;
  if (!('showModal' in dialog)) {
    Object.assign(dialog, {
      showModal(this: HTMLDialogElement) {
        this.open = true;
      },
    });
  }
  if (!('close' in dialog)) {
    Object.assign(dialog, {
      close(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      },
    });
  }
}
