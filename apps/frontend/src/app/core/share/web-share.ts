import { InjectionToken, Service, inject } from '@angular/core';

/**
 * Web Share and Clipboard APIs of the browser: the real `navigator` in the app, a fake one in tests. `share` is
 * missing when the browser does not support it (e.g. most desktop browsers), `clipboard` outside a secure context
 * (https or localhost).
 */
export const SHARE_NAVIGATOR = new InjectionToken<Partial<Pick<Navigator, 'share' | 'clipboard'>>>(
  'SHARE_NAVIGATOR',
  { factory: () => navigator },
);

/**
 * Sends a link to other people: through the native share sheet of the device (messages, email...), or by copying it
 * to the clipboard when the browser has no share sheet.
 */
@Service()
export class WebShare {
  /**
   * Web Share and Clipboard APIs of the browser
   */
  private readonly navigator = inject(SHARE_NAVIGATOR);

  /**
   * True when the browser can open its share sheet
   */
  readonly supported = typeof this.navigator.share === 'function';

  /**
   * True when the browser lets the app write to the clipboard: the fallback of the share sheet
   */
  readonly canCopy = typeof this.navigator.clipboard?.writeText === 'function';

  /**
   * Opens the share sheet with `data`. Never throws: a cancelled share, or one the browser refuses, does nothing.
   */
  async share(data: ShareData): Promise<void> {
    try {
      await this.navigator.share?.(data);
    } catch {
      // The user closed the share sheet, or the browser refused (nothing to tell the user)
    }
  }

  /**
   * Copies `text` to the clipboard. Never throws.
   * @returns true once copied, false when the browser refused (no clipboard, permission denied)
   */
  async copy(text: string): Promise<boolean> {
    try {
      if (!this.navigator.clipboard) return false;
      await this.navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
