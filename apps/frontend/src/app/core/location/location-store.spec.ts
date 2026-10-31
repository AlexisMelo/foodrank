import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BROWSER_NAVIGATOR, LocationStore } from './location-store';

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
 * A fresh store (its state is shared app-wide), reading the browser APIs from `fakeNavigator`.
 */
function withNavigator(fakeNavigator: Partial<Navigator>): LocationStore {
  TestBed.configureTestingModule({
    providers: [{ provide: BROWSER_NAVIGATOR, useValue: fakeNavigator }],
  });
  return TestBed.inject(LocationStore);
}

describe('LocationStore', () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  /**
   * Position first given by the browser
   */
  const caen = { coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition;

  /**
   * Position given once the user has moved
   */
  const paris = { coords: { latitude: 48.86, longitude: 2.35 } } as GeolocationPosition;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // The city of the position is read from the API
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  /**
   * Replaces the browser geolocation: `getCurrentPosition` runs `answer` with the success and error callbacks,
   * and the Permissions API reports `permissionState`.
   */
  function stubGeolocation(
    answer: (success: PositionCallback, error: PositionErrorCallback) => void,
    permissionState: PermissionState = 'prompt',
  ): LocationStore {
    getCurrentPosition = vi.fn(answer);
    return withNavigator({
      geolocation: { getCurrentPosition } as unknown as Geolocation,
      permissions: {
        query: vi.fn().mockResolvedValue({ state: permissionState }),
      } as unknown as Permissions,
    });
  }

  /**
   * A store that knows the position `caen`.
   */
  function locatedInCaen(): LocationStore {
    const locationStore = stubGeolocation((success) => success(caen));
    locationStore.requestLocation();
    return locationStore;
  }

  it('stores the position when the user accepts', () => {
    const locationStore = stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    );

    locationStore.requestLocation();

    expect(locationStore.status()).toBe('granted');
    expect(locationStore.location()).toEqual({ lat: 49.18, lon: -0.37 });
  });

  it('is dismissed when the user closes the prompt', async () => {
    const locationStore = stubGeolocation(
      (_, error) => error(positionError(PERMISSION_DENIED)),
      'prompt',
    );

    locationStore.requestLocation();
    await flushPromises();

    expect(locationStore.status()).toBe('dismissed');
    expect(locationStore.location()).toBeNull();
  });

  it('is blocked when geolocation is refused in the browser settings', async () => {
    const locationStore = stubGeolocation(
      (_, error) => error(positionError(PERMISSION_DENIED)),
      'denied',
    );

    locationStore.requestLocation();
    await flushPromises();

    expect(locationStore.status()).toBe('blocked');
  });

  it('is unavailable when the position cannot be obtained', async () => {
    const locationStore = stubGeolocation((_, error) => error(positionError(TIMEOUT)));

    locationStore.requestLocation();
    await flushPromises();

    expect(locationStore.status()).toBe('unavailable');
  });

  it('is unavailable when the browser does not support geolocation', () => {
    const locationStore = withNavigator({});

    locationStore.requestLocation();

    expect(locationStore.status()).toBe('unavailable');
  });

  it('does not ask again once the position is known', () => {
    const locationStore = stubGeolocation((success) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    );

    locationStore.requestLocation();
    locationStore.requestLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('asks again after the user closed the prompt', async () => {
    const locationStore = stubGeolocation((_, error) => error(positionError(PERMISSION_DENIED)));
    locationStore.requestLocation();
    await flushPromises();

    getCurrentPosition.mockImplementation((success: PositionCallback) =>
      success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
    );
    locationStore.requestLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(locationStore.status()).toBe('granted');
  });

  describe('city searches are centered on', () => {
    const defaultCityUrl = '/api/places/area';
    const caenUrl = '/api/places/area?lat=49.18&lon=-0.37';

    /**
     * Pending request of the store for the city at `url`.
     */
    function cityRequest(url: string): TestRequest {
      return TestBed.inject(HttpTestingController).expectOne(url);
    }

    /**
     * The API answers `locality` to the pending request for `url`; resolves once the store has read the answer.
     */
    async function answerCity(url: string, locality: string | null): Promise<void> {
      cityRequest(url).flush({ locality, isDefault: url === defaultCityUrl });
      await flushPromises();
    }

    it('is the default city of the API as soon as the store is created', async () => {
      const locationStore = withNavigator({});

      await answerCity(defaultCityUrl, 'Lyon');

      expect(locationStore.city()).toBe('Lyon');
      expect(locationStore.cityIsDefault()).toBe(true);
    });

    it("is the user's city once located", async () => {
      const locationStore = stubGeolocation((success) => success(caen));
      await answerCity(defaultCityUrl, 'Lyon');

      locationStore.requestLocation();
      await answerCity(caenUrl, 'Caen');

      expect(locationStore.city()).toBe('Caen');
      expect(locationStore.cityIsDefault()).toBe(false);
    });

    it('is still told to be the default city once located, until the city of the position is known', async () => {
      const locationStore = stubGeolocation((success) => success(caen));
      await answerCity(defaultCityUrl, 'Lyon');

      locationStore.requestLocation();

      expect(locationStore.status()).toBe('granted');
      expect(locationStore.city()).toBe('Lyon');
      expect(locationStore.cityIsDefault()).toBe(true);
    });

    it('keeps the previous city until the one of the new position is known', async () => {
      const locationStore = locatedInCaen();
      await answerCity(caenUrl, 'Caen');

      // The user has moved
      getCurrentPosition.mockImplementation((success: PositionCallback) => success(paris));
      locationStore.refreshLocation();
      expect(locationStore.city()).toBe('Caen');

      await answerCity('/api/places/area?lat=48.86&lon=2.35', 'Paris');
      expect(locationStore.city()).toBe('Paris');
    });

    it('is loaded again each time the position is refreshed, even when the user has not moved', () => {
      const locationStore = locatedInCaen();

      locationStore.refreshLocation();

      expect(TestBed.inject(HttpTestingController).match(caenUrl)).toHaveLength(2);
    });

    it('ignores a late answer for a previous position', async () => {
      const locationStore = locatedInCaen();
      const defaultCity = cityRequest(defaultCityUrl);

      await answerCity(caenUrl, 'Caen');
      defaultCity.flush({ locality: 'Lyon', isDefault: true });
      await flushPromises();

      expect(locationStore.city()).toBe('Caen');
    });

    it('is the default city again once the location is no longer allowed', async () => {
      const locationStore = locatedInCaen();
      // Answer to the request made at creation, ignored as the user is already located
      await answerCity(defaultCityUrl, 'Lyon');
      await answerCity(caenUrl, 'Caen');

      getCurrentPosition.mockImplementation((_: PositionCallback, error: PositionErrorCallback) =>
        error(positionError(PERMISSION_DENIED)),
      );
      locationStore.refreshLocation();
      await flushPromises();
      await answerCity(defaultCityUrl, 'Lyon');

      expect(locationStore.city()).toBe('Lyon');
      expect(locationStore.cityIsDefault()).toBe(true);
    });

    it('keeps the previous city when the API fails', async () => {
      const locationStore = locatedInCaen();
      await answerCity(caenUrl, 'Caen');

      locationStore.refreshLocation();
      cityRequest(caenUrl).flush(null, { status: 500, statusText: 'Server Error' });
      await flushPromises();

      expect(locationStore.city()).toBe('Caen');
      expect(locationStore.cityIsDefault()).toBe(false);
    });

    it('keeps the previous city when the API finds none at the position', async () => {
      const locationStore = locatedInCaen();
      await answerCity(caenUrl, 'Caen');

      locationStore.refreshLocation();
      await answerCity(caenUrl, null);

      expect(locationStore.city()).toBe('Caen');
    });
  });

  describe('when the position is refreshed', () => {
    it('keeps the known position while asking for a fresh one, then stores it', () => {
      const locationStore = locatedInCaen();
      let answer: PositionCallback = () => undefined;
      getCurrentPosition.mockImplementation((success: PositionCallback) => {
        answer = success;
      });

      locationStore.refreshLocation();
      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(locationStore.status()).toBe('granted');
      expect(locationStore.location()).toEqual({ lat: 49.18, lon: -0.37 });

      answer(paris);
      expect(locationStore.location()).toEqual({ lat: 48.86, lon: 2.35 });
    });

    it('keeps the known position when the fresh one cannot be obtained', async () => {
      const locationStore = locatedInCaen();
      getCurrentPosition.mockImplementation((_: PositionCallback, error: PositionErrorCallback) =>
        error(positionError(TIMEOUT)),
      );

      locationStore.refreshLocation();
      await flushPromises();

      expect(locationStore.status()).toBe('granted');
      expect(locationStore.location()).toEqual({ lat: 49.18, lon: -0.37 });
    });

    it('forgets the position when the location is no longer allowed', async () => {
      const locationStore = locatedInCaen();
      getCurrentPosition.mockImplementation((_: PositionCallback, error: PositionErrorCallback) =>
        error(positionError(PERMISSION_DENIED)),
      );

      locationStore.refreshLocation();
      await flushPromises();

      expect(locationStore.status()).toBe('dismissed');
      expect(locationStore.location()).toBeNull();
    });

    it('asks only once at a time', () => {
      const locationStore = locatedInCaen();
      getCurrentPosition.mockImplementation(() => undefined);

      locationStore.refreshLocation();
      locationStore.refreshLocation();

      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    });

    it('is pending like a first request when the position is not known yet', () => {
      const locationStore = stubGeolocation(() => undefined);

      locationStore.refreshLocation();

      expect(locationStore.status()).toBe('pending');
    });
  });

  describe('when the permission changes in the browser settings', () => {
    /**
     * Permission of the fake Permissions API, which the service watches
     */
    let permission: { state: PermissionState; onchange: (() => void) | null };

    /**
     * A service whose first request is refused in the browser settings.
     */
    async function blockedLocation(): Promise<LocationStore> {
      permission = { state: 'denied', onchange: null };
      getCurrentPosition = vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
        error(positionError(PERMISSION_DENIED)),
      );
      const locationStore = withNavigator({
        geolocation: { getCurrentPosition } as unknown as Geolocation,
        permissions: { query: vi.fn().mockResolvedValue(permission) } as unknown as Permissions,
      });
      locationStore.requestLocation();
      await flushPromises();
      return locationStore;
    }

    /**
     * The user changes the geolocation permission of the site to `state`.
     */
    function changePermission(state: PermissionState): void {
      permission.state = state;
      permission.onchange?.();
    }

    it('locates the user once the location is allowed', async () => {
      const locationStore = await blockedLocation();
      expect(locationStore.status()).toBe('blocked');

      getCurrentPosition.mockImplementation((success: PositionCallback) =>
        success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
      );
      changePermission('granted');

      expect(locationStore.status()).toBe('granted');
      expect(locationStore.location()).toEqual({ lat: 49.18, lon: -0.37 });
    });

    it('forgets the position once the location is blocked again', async () => {
      const locationStore = await blockedLocation();
      getCurrentPosition.mockImplementation((success: PositionCallback) =>
        success({ coords: { latitude: 49.18, longitude: -0.37 } } as GeolocationPosition),
      );
      changePermission('granted');

      changePermission('denied');

      expect(locationStore.status()).toBe('blocked');
      expect(locationStore.location()).toBeNull();
    });
  });
});
