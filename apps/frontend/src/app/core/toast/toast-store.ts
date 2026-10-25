import { Service, computed, signal } from '@angular/core';

/**
 * Time a toast stays on screen, in milliseconds
 */
export const TOAST_DURATION_MS = 4000;

/**
 * A message shown at the bottom of the app for a few seconds.
 */
export interface Toast {
  /**
   * Unique id, increasing with each toast shown
   */
  id: number;

  /**
   * Text of the toast
   */
  message: string;
}

/**
 * Error messages shown at the bottom of the app for a few seconds (toasts), and the outlets rendering them. Only the
 * last outlet registered renders the toasts: a modal <dialog> sits above the page and makes it inert, hiding the
 * page's toasts, so a modal open while a toast can show registers its own outlet, and hands back once removed.
 */
@Service()
export class ToastStore {
  /**
   * Writable state behind toasts
   */
  private readonly shown = signal<Toast[]>([]);

  /**
   * Toasts on screen, oldest first
   */
  readonly toasts = this.shown.asReadonly();

  /**
   * Id given to the next toast shown
   */
  private nextToastId = 1;

  /**
   * Ids of the outlets registered, oldest first
   */
  private readonly outlets = signal<symbol[]>([]);

  /**
   * Id of the outlet rendering the toasts: the last registered; undefined when there is none
   */
  readonly activeOutlet = computed(() => this.outlets().at(-1));

  /**
   * Shows `message` for TOAST_DURATION_MS, after the toasts already shown
   */
  show(message: string): void {
    const id = this.nextToastId++;
    this.shown.update((toasts) => [...toasts, { id, message }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }

  /**
   * Hides the toast `id` before its time is up; does nothing when it is already hidden
   */
  dismiss(id: number): void {
    this.shown.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /**
   * Registers a new outlet, which renders the toasts until it is unregistered or another one is registered
   * @returns the id of the outlet, to unregister it
   */
  register(): symbol {
    const outlet = Symbol('toast-outlet');
    this.outlets.update((outlets) => [...outlets, outlet]);
    return outlet;
  }

  /**
   * Unregisters the outlet `outlet`: the one registered before it renders the toasts again
   */
  unregister(outlet: symbol): void {
    this.outlets.update((outlets) => outlets.filter((o) => o !== outlet));
  }
}
