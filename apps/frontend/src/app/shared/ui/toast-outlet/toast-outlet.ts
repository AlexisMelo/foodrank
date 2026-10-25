import { Component, DestroyRef, computed, inject } from '@angular/core';
import { ToastStore } from '@/core/toast/toast-store';

/**
 * Renders the toasts of ToastStore at the bottom of the screen, `--toast-bottom` above it (24px by default). Placed in
 * the Shell, and in each modal open while a toast can show: only the last outlet created renders them, as a modal
 * <dialog> hides the page below it.
 */
@Component({
  selector: 'app-toast-outlet',
  styleUrl: './toast-outlet.scss',
  templateUrl: './toast-outlet.html',
})
export class ToastOutlet {
  /**
   * Toasts to render, and the outlet rendering them
   */
  protected readonly toastStore = inject(ToastStore);

  /**
   * Id of this outlet in the store, unregistered when the outlet is removed
   */
  private readonly outletId = this.toastStore.register();

  /**
   * True when this outlet renders the toasts: it is the last one created
   */
  protected readonly active = computed(() => this.toastStore.activeOutlet() === this.outletId);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.toastStore.unregister(this.outletId));
  }
}
