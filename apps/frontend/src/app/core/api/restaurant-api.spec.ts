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
