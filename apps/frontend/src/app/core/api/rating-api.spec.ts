import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL, apiInterceptor } from './api-interceptor';
import { RatingApi } from './rating-api';

describe('RatingApi', () => {
  let api: RatingApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test' },
      ],
    });
    api = TestBed.inject(RatingApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('rateRestaurant', () => {
    it('posts the rating with the session cookie, encoding the restaurant id', async () => {
      const rating = { food: 80, service: 60, setting: 40, bonus: true };

      const result = firstValueFrom(api.rateRestaurant('a/b', rating));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb/ratings');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(rating);
      expect(req.request.withCredentials).toBe(true);
      req.flush({});

      await result;
    });

    it('rethrows API errors so the page can explain them', async () => {
      const result = firstValueFrom(
        api.rateRestaurant('r1', { food: 50, service: 50, setting: 50, bonus: false }),
      );
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings')
        .flush(null, { status: 409, statusText: 'Conflict' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 409 });
    });
  });

  describe('fetchRatingSummary', () => {
    it("gets the restaurant's averages, encoding the restaurant id", async () => {
      const summary = { count: 2, food: 80, service: 50, setting: 25, global: 51.7 };

      const result = firstValueFrom(api.fetchRatingSummary('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb/ratings/summary');
      expect(req.request.method).toBe('GET');
      req.flush(summary);

      expect(await result).toEqual(summary);
    });
  });

  describe('fetchRecentRatings', () => {
    it('asks for the 5 most recent ratings by default, encoding the restaurant id', async () => {
      const ratings = [{ userId: 'u1', date: '2026-03-07T12:00:00+00:00', userName: 'Camille' }];

      const result = firstValueFrom(api.fetchRecentRatings('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb/ratings?limit=5');
      expect(req.request.method).toBe('GET');
      req.flush(ratings);

      expect(await result).toEqual(ratings);
    });

    it('rethrows API errors', async () => {
      const result = firstValueFrom(api.fetchRecentRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings?limit=5')
        .flush(null, { status: 503, statusText: 'Service Unavailable' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 503 });
    });
  });

  describe('fetchMyRatings', () => {
    it("returns the logged-in user's ratings, sending the session cookie", async () => {
      const ratings = [{ userId: 'me', date: '2026-03-07T12:00:00+00:00' }];

      const result = firstValueFrom(api.fetchMyRatings('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb/ratings/mine');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(ratings);

      expect(await result).toEqual(ratings);
    });

    it('returns no rating when the user is not logged in', async () => {
      const result = firstValueFrom(api.fetchMyRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings/mine')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(await result).toEqual([]);
    });

    it('rethrows other errors', async () => {
      const result = firstValueFrom(api.fetchMyRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings/mine')
        .flush(null, { status: 404, statusText: 'Not Found' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 404 });
    });
  });

  describe('fetchUserRatings', () => {
    it("returns the logged-in user's ratings by default", async () => {
      const ratings = [{ restaurantId: 'r1', date: '2026-03-07T12:00:00+00:00' }];

      const result = firstValueFrom(api.fetchUserRatings());
      const req = httpTesting.expectOne('http://api.test/api/users/me/ratings');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(ratings);

      expect(await result).toEqual(ratings);
    });

    it('reads the ratings of another user by id', async () => {
      const result = firstValueFrom(api.fetchUserRatings('u2'));
      const req = httpTesting.expectOne('http://api.test/api/users/u2/ratings');
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);

      await result;
    });
  });
});
