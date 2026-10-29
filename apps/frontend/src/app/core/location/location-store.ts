import { HttpClient } from '@angular/common/http';
import { InjectionToken, Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { locationParams } from '@/core/api/location-params';
import type { SearchArea, UserLocation } from '@/core/models/location.model';

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
 * Browser APIs used by LocationStore: the real `navigator` in the app, a fake one in tests. `geolocation` is missing
 * when the browser does not support it, `permissions` when it has no Permissions API.
 */
export const BROWSER_NAVIGATOR = new InjectionToken<
  Partial<Pick<Navigator, 'geolocation' | 'permissions'>>
>('BROWSER_NAVIGATOR', { factory: () => navigator });

/**
 * Location of the user, shared across the app: the browser geolocation, used to favor nearby restaurants in search,
 * and the city searches are centered on (GET /api/places/area): the default city of the API, then the user's.
 * Never blocks: `location` stays null while pending or if refused (the API then uses its default city).
 */
@Service()
export class LocationStore {
  /**
   * Geolocation and Permissions APIs of the browser
   */
  private readonly navigator = inject(BROWSER_NAVIGATOR);

  /**
   * Reads the city of a position from the API
   */
  private readonly http = inject(HttpClient);

  /**
   * Writable state behind location
   */
  private readonly position = signal<UserLocation | null>(null);

  /**
   * Writable state behind status
   */
  private readonly state = signal<LocationStatus>('idle');

  /**
   * Writable state behind city
   */
  private readonly loadedCity = signal<string | null>(null);

  /**
   * True while the browser is asked for the position, so it is only asked once at a time
   */
  private locating = false;

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
   * City searches are centered on: the default city of the API, then the user's once located. Null only until the
   * first answer; the previous city stays while the next one loads
   */
  readonly city = this.loadedCity.asReadonly();

  constructor() {
    // The default city, until the user is located
    void this.loadCity();
  }

  /**
   * Asks the browser for the position, unless it is already known or being asked.
   */
  requestLocation(): void {
    if (this.state() === 'granted') return;
    this.locate();
  }

  /**
   * Asks the browser for a fresh position, unless it is being asked. A known position stays meanwhile, and when the
   * new one cannot be obtained, so a search started meanwhile is still near the user.
   */
  refreshLocation(): void {
    this.locate();
  }

  /**
   * Asks the browser for the position, unless it is being asked; `pending` only when the position is not known yet.
   */
  private locate(): void {
    if (this.locating) return;
    const geolocation = this.navigator.geolocation;
    if (!geolocation) {
      this.state.set('unavailable');
      return;
    }
    this.locating = true;
    if (this.state() !== 'granted') this.state.set('pending');
    void this.watchPermission(() => this.requestLocation());
    geolocation.getCurrentPosition(
      (position) => {
        this.setPosition({ lat: position.coords.latitude, lon: position.coords.longitude });
        this.state.set('granted');
        this.locating = false;
      },
      async (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          const blocked = await this.isBlocked();
          this.setPosition(null);
          this.state.set(blocked ? 'blocked' : 'dismissed');
        } else if (this.state() === 'pending') {
          // A known position is kept when the fresh one cannot be obtained
          this.state.set('unavailable');
        }
        this.locating = false;
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  /**
   * Stores the position (null when it is forgotten) and loads its city.
   */
  private setPosition(position: UserLocation | null): void {
    this.position.set(position);
    void this.loadCity();
  }

  /**
   * Loads the city of the current position, the default city when there is none. The previous city stays when the
   * API fails or finds no city there, and when the position has changed since the request.
   */
  private async loadCity(): Promise<void> {
    const position = this.position();
    try {
      const { locality } = await firstValueFrom(
        this.http.get<SearchArea>('/api/places/area', { params: locationParams(position) }),
      );
      if (locality && this.position() === position) this.loadedCity.set(locality);
    } catch {
      // The previous city stays
    }
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
          this.setPosition(null);
          this.state.set('blocked');
        }
      };
    } catch {
      // Geolocation not supported by the Permissions API: changes are only detected on the next request
    }
  }
}
