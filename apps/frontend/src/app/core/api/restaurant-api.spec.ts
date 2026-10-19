import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL, apiInterceptor } from './api-interceptor';
import { RestaurantApi } from './restaurant-api';

describe('RestaurantApi', () => {
  let api: RestaurantApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test' },
      ],
    });
    api = TestBed.inject(RestaurantApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('fetchRestaurantById', () => {
    it('returns the restaurant and encodes the id in the url', async () => {
      const result = firstValueFrom(api.fetchRestaurantById('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'a/b', name: 'Pizza Roma' });

      expect((await result)?.name).toBe('Pizza Roma');
    });

    it('returns undefined when the restaurant does not exist', async () => {
      const result = firstValueFrom(api.fetchRestaurantById('unknown'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/unknown')
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(await result).toBeUndefined();
    });

    it('rethrows other errors', async () => {
      const result = firstValueFrom(api.fetchRestaurantById('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1')
        .flush(null, { status: 503, statusText: 'Service Unavailable' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 503 });
    });
  });

  describe('autocompletePlaces', () => {
    it('sends the user position', async () => {
      const result = firstValueFrom(api.autocompletePlaces('pizza', { lat: 49.18, lon: -0.37 }));
      const req = httpTesting.expectOne(
        'http://api.test/api/places/autocomplete?input=pizza&lat=49.18&lon=-0.37',
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);

      await result;
    });

    it('omits the position when unknown, so the API uses its default city', async () => {
      const result = firstValueFrom(api.autocompletePlaces('pizza', null));
      httpTesting.expectOne('http://api.test/api/places/autocomplete?input=pizza').flush([]);

      await result;
    });
  });

  describe('fetchRestaurants', () => {
    it('gets every restaurant', async () => {
      const result = firstValueFrom(api.fetchRestaurants());
      const req = httpTesting.expectOne('http://api.test/api/restaurants');
      expect(req.request.method).toBe('GET');
      req.flush([{ id: 'r1' }, { id: 'r2' }]);

      expect((await result).map((r) => r.id)).toEqual(['r1', 'r2']);
    });
  });

  describe('searchPlaces', () => {
    it('sends the query and the user position, encoded', async () => {
      const result = firstValueFrom(api.searchPlaces('pizza & co', { lat: 49.18, lon: -0.37 }));
      const req = httpTesting.expectOne(
        'http://api.test/api/places/search?query=pizza%20%26%20co&lat=49.18&lon=-0.37',
      );
      expect(req.request.method).toBe('GET');
      req.flush([{ placeId: 'N1', name: 'Pizza & Co', secondaryText: 'Caen' }]);

      expect((await result)[0]?.placeId).toBe('N1');
    });

    it('omits the position when unknown, so the API uses its default city', async () => {
      const result = firstValueFrom(api.searchPlaces('pizza'));
      httpTesting.expectOne('http://api.test/api/places/search?query=pizza').flush([]);

      await result;
    });
  });

  describe('fetchSearchArea', () => {
    it('gets the city around the user position', async () => {
      const result = firstValueFrom(api.fetchSearchArea({ lat: 49.18, lon: -0.37 }));
      const req = httpTesting.expectOne('http://api.test/api/places/area?lat=49.18&lon=-0.37');
      expect(req.request.method).toBe('GET');
      req.flush({ locality: 'Caen', isDefault: false });

      expect(await result).toEqual({ locality: 'Caen', isDefault: false });
    });

    it('gets the default city of the API when the position is unknown', async () => {
      const result = firstValueFrom(api.fetchSearchArea(null));
      httpTesting
        .expectOne('http://api.test/api/places/area')
        .flush({ locality: 'Lyon', isDefault: true });

      expect((await result).isDefault).toBe(true);
    });
  });

  describe('createRestaurantFromPlace', () => {
    it('posts the place id and returns the restaurant', async () => {
      const result = firstValueFrom(api.createRestaurantFromPlace('N42'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/from-place');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ placeId: 'N42' });
      req.flush({ id: 'r1' });

      expect((await result).id).toBe('r1');
    });
  });
});
