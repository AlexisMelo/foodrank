import { TestBed } from '@angular/core/testing';
import { TOAST_DURATION_MS, ToastStore } from './toast-store';

describe('ToastStore', () => {
  let store: ToastStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = TestBed.inject(ToastStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Messages of the toasts on screen, oldest first.
   */
  function messages(): string[] {
    return store.toasts().map((toast) => toast.message);
  }

  it('shows each message, oldest first, until its own time is up', () => {
    store.show('First');
    vi.advanceTimersByTime(1000);
    store.show('Second');
    expect(messages()).toEqual(['First', 'Second']);

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    expect(messages()).toEqual(['Second']);

    vi.advanceTimersByTime(1000);
    expect(messages()).toEqual([]);
  });

  it('shows errors, unless told the message confirms a change', () => {
    store.show('Could not save');
    store.show('Pizza Roma added to Top 10.', 'success');

    expect(store.toasts().map((toast) => toast.kind)).toEqual(['error', 'success']);
  });

  it('hides a toast sooner when it is dismissed, leaving the others', () => {
    store.show('First');
    store.show('Second');

    store.dismiss(store.toasts()[0]!.id);

    expect(messages()).toEqual(['Second']);
    // Its timer ending later does not hide another toast
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(messages()).toEqual([]);
  });

  it('renders the toasts in the last outlet registered, then hands back to the previous one', () => {
    expect(store.activeOutlet()).toBeUndefined();

    const page = store.register();
    expect(store.activeOutlet()).toBe(page);

    const dialog = store.register();
    expect(store.activeOutlet()).toBe(dialog);

    store.unregister(dialog);
    expect(store.activeOutlet()).toBe(page);
  });
});
