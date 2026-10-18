import { InjectionToken, Service, inject, signal } from '@angular/core';
import type { UserLocation as UserPosition } from '@/core/models/location.model';

/**
 * - `idle`: not asked yet
 * - `pending`: waiting for the browser (permission prompt or GPS fix)
 * - `granted`: position known
 * - `dismissed`: prompt refused or closed, but the browser still allows asking again
 * - `blocked`: refused in the browser settings, the site cannot ask again
 * - `unavailable`: geolocation unsupported, or the position could not be obtained (timeout, no signal)
 */
export type LocationStatus =
  'idle' | 'pending' | 'granted' | 'dismissed' | 'blocked' | 'unavailable';

/**
 * Browser APIs used by UserLocation: the real `navigator` in the app, a fake one in tests. `geolocation` is missing
 * when the browser does not support it, `permissions` when it has no Permissions API.
 */
export const BROWSER_NAVIGATOR = new InjectionToken<
  Partial<Pick<Navigator, 'geolocation' | 'permissions'>>
>('BROWSER_NAVIGATOR', { factory: () => navigator });

/**
 * Browser geolocation, used to favor nearby restaurants in search. Shared across the app.
 * Never blocks: `location` stays null while pending or if refused (the API then uses its default city).
 */
@Service()
export class UserLocation {
  /**
   * Geolocation and Permissions APIs of the browser
   */
  private readonly navigator = inject(BROWSER_NAVIGATOR);

  /**
   * Writable state behind location
   */
  private readonly position = signal<UserPosition | null>(null);

  /**
   * Writable state behind status
   */
  private readonly state = signal<LocationStatus>('idle');

  /**
   * True once the permission changes are followed, so the listener is only set once
   */
  private watchingPermission = false;

  /**
   * Position of the user; null until granted, and when refused or unavailable
   */
  readonly location = this.position.asReadonly();

  /**
   * Where the location request stands
   */
  readonly status = this.state.asReadonly();

  /**
   * Asks the browser for the position, unless it is already known or being asked.
   */
  requestLocation(): void {
    if (this.state() === 'pending' || this.state() === 'granted') return;
    const geolocation = this.navigator.geolocation;
    if (!geolocation) {
      this.state.set('unavailable');
      return;
    }
    this.state.set('pending');
    void this.watchPermission(() => this.requestLocation());
    geolocation.getCurrentPosition(
      (position) => {
        this.position.set({ lat: position.coords.latitude, lon: position.coords.longitude });
        this.state.set('granted');
      },
      async (error) => {
        this.position.set(null);
        if (error.code === error.PERMISSION_DENIED) {
          this.state.set((await this.isBlocked()) ? 'blocked' : 'dismissed');
        } else {
          this.state.set('unavailable');
        }
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  /**
   * Asks the Permissions API whether geolocation is blocked in the browser settings.
   */
  private async isBlocked(): Promise<boolean> {
    const permissions = this.navigator.permissions;
    if (!permissions) return false;
    try {
      const permission = await permissions.query({ name: 'geolocation' });
      return permission.state === 'denied';
    } catch {
      return false;
    }
  }

  /**
   * Follows permission changes made in the browser settings while the app is open.
   */
  private async watchPermission(onGranted: () => void): Promise<void> {
    if (this.watchingPermission) return;
    this.watchingPermission = true;
    const permissions = this.navigator.permissions;
    // Permissions API not supported: changes are only detected on the next request
    if (!permissions) return;
    try {
      const permission = await permissions.query({ name: 'geolocation' });
      permission.onchange = () => {
        if (permission.state === 'granted') {
          onGranted();
        } else if (permission.state === 'denied') {
          this.position.set(null);
          this.state.set('blocked');
        }
      };
    } catch {
      // Geolocation not supported by the Permissions API: changes are only detected on the next request
    }
  }
}
