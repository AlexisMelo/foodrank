import { TestBed } from '@angular/core/testing';
import { BROWSER_NAVIGATOR, UserLocation } from './user-location';

/**
 * Code of GeolocationPositionError when the user refuses
 */
const PERMISSION_DENIED = 1;

/**
 * Code of GeolocationPositionError when the position takes too long to obtain
 */
const TIMEOUT = 3;

/**
 * Builds the error the browser gives when the position cannot be obtained.
 */
function positionError(code: number): GeolocationPositionError {
  return { code, PERMISSION_DENIED, message: '' } as GeolocationPositionError;
}

/**
 * Waits for the pending promises (the Permissions API answer).
 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/**
 * A fresh service (its state is shared app-wide), reading the browser APIs from `fakeNavigator`.
 */
function withNavigator(fakeNavigator: Partial<Navigator>): UserLocation {
  TestBed.configureTestingModule({
    providers: [{ provide: BROWSER_NAVIGATOR, useValue: fakeNavigator }],
  });
  return TestBed.inject(UserLocation);
}

describe('UserLocation', () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  /**
   * Replaces the browser geolocation: `getCurrentPosition` runs `answer` with the success and error callbacks,
   * and the Permissions API reports `permissionState`.
   */
  function stubGeolocation(
    answer: (success: PositionCallback, error: PositionErrorCallback) => void,
    permissionState: PermissionState = 'prompt',
  ): UserLocation {
    getCurrentPosition = vi.fn(answer);
    return withNavigator({
      geolocation: { getCurrentPosition } as unknown as Geolocation,
      permissions: {
        query: vi.fn().mockResolvedValue({ state: permissionState }),
      } as unknown as Permissions,
    });
  }

  it('stores the position when the user accepts', () => {
    const userLocation = stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    );

    userLocation.requestLocation();

    expect(userLocation.status()).toBe('granted');
    expect(userLocation.location()).toEqual({ lat: 49.18, lon: -0.37 });
  });

  it('is dismissed when the user closes the prompt', async () => {
    const userLocation = stubGeolocation(
      (_, error) => error(positionError(PERMISSION_DENIED)),
      'prompt',
    );

    userLocation.requestLocation();
    await flushPromises();

    expect(userLocation.status()).toBe('dismissed');
    expect(userLocation.location()).toBeNull();
  });

  it('is blocked when geolocation is refused in the browser settings', async () => {
    const userLocation = stubGeolocation(
      (_, error) => error(positionError(PERMISSION_DENIED)),
      'denied',
    );

    userLocation.requestLocation();
    await flushPromises();

    expect(userLocation.status()).toBe('blocked');
  });

  it('is unavailable when the position cannot be obtained', async () => {
    const userLocation = stubGeolocation((_, error) => error(positionError(TIMEOUT)));

    userLocation.requestLocation();
    await flushPromises();

    expect(userLocation.status()).toBe('unavailable');
  });

  it('is unavailable when the browser does not support geolocation', () => {
    const userLocation = withNavigator({});

    userLocation.requestLocation();

    expect(userLocation.status()).toBe('unavailable');
  });

  it('does not ask again once the position is known', () => {
    const userLocation = stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    );

    userLocation.requestLocation();
    userLocation.requestLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
