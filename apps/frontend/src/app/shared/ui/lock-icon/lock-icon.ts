import { Component } from '@angular/core';

/**
 * Small padlock put on a locked button (e.g. a review button once the user reviewed a restaurant today), read "locked"
 * by screen readers. Sized by the parent through the host element's width and height (1em by default) and colored
 * with `color`.
 */
@Component({
  selector: 'app-lock-icon',
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: 1em;
      height: 1em;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="locked"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  `,
})
export class LockIcon {}
