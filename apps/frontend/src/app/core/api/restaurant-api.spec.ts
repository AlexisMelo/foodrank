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

  describe('fetchSuggestions', () => {
    it('sends the limit and the user position', async () => {
      const result = firstValueFrom(api.fetchSuggestions({ lat: 49.18, lon: -0.37 }, 5));
      const req = httpTesting.expectOne(
        'http://api.test/api/restaurants/suggestions?limit=5&lat=49.18&lon=-0.37',
      );
      expect(req.request.method).toBe('GET');
      req.flush([{ restaurant: { id: 'r1' }, distanceKm: 0.556 }]);

      expect(await result).toEqual([{ restaurant: { id: 'r1' }, distanceKm: 0.556 }]);
    });

    it('omits the position when unknown, so the API sorts from its default city', async () => {
      const result = firstValueFrom(api.fetchSuggestions(null, 5));
      httpTesting.expectOne('http://api.test/api/restaurants/suggestions?limit=5').flush([]);

      expect(await result).toEqual([]);
    });
  });

  describe('searchPlaces', () => {
    it('sends the query, the limit and the user position, encoded', async () => {
      const result = firstValueFrom(api.searchPlaces('pizza & co', { lat: 49.18, lon: -0.37 }, 15));
      const req = httpTesting.expectOne(
        'http://api.test/api/places/search?query=pizza%20%26%20co&limit=15&lat=49.18&lon=-0.37',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        results: [{ placeId: 'N1', name: 'Pizza & Co', secondaryText: 'Caen' }],
        hasMore: true,
      });

      expect(await result).toEqual({
        results: [{ placeId: 'N1', name: 'Pizza & Co', secondaryText: 'Caen' }],
        hasMore: true,
      });
    });

    it('omits the position when unknown, so the API uses its default city', async () => {
      const result = firstValueFrom(api.searchPlaces('pizza', null, 5));
      httpTesting
        .expectOne('http://api.test/api/places/search?query=pizza&limit=5')
        .flush({ results: [], hasMore: false });

      await result;
    });
  });

  describe('createRestaurantFromPlace', () => {
    it('posts the place id and returns the restaurant, and whether it was created', async () => {
      const result = firstValueFrom(api.createRestaurantFromPlace('N42'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/from-place');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ placeId: 'N42' });
      req.flush({ restaurant: { id: 'r1' }, created: true });

      expect(await result).toEqual({ restaurant: { id: 'r1' }, created: true });
    });
  });
});
