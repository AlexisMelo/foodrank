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

  describe('fetchRecentFollowedRatings', () => {
    it('asks for the 5 most recent ratings of the users followed by default, with the session cookie', async () => {
      const ratings = [{ userId: 'u1', date: '2026-03-07T12:00:00+00:00', userName: 'Camille' }];

      const result = firstValueFrom(api.fetchRecentFollowedRatings('a/b'));
      const req = httpTesting.expectOne(
        'http://api.test/api/restaurants/a%2Fb/ratings/followed?limit=5',
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(ratings);

      expect(await result).toEqual(ratings);
    });

    it('returns no rating when the user is not logged in', async () => {
      const result = firstValueFrom(api.fetchRecentFollowedRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings/followed?limit=5')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(await result).toEqual([]);
    });

    it('rethrows other errors', async () => {
      const result = firstValueFrom(api.fetchRecentFollowedRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings/followed?limit=5')
        .flush(null, { status: 404, statusText: 'Not Found' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 404 });
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

  describe('deleteMyRating', () => {
    it('deletes the rating of the moment given, encoding it in the URL, with the session cookie', async () => {
      const left = [{ userId: 'me', date: '2026-01-02T12:00:00+00:00', isActive: true }];

      const result = firstValueFrom(api.deleteMyRating('a/b', '2026-03-07T21:30:00.123456+00:00'));
      const req = httpTesting.expectOne(
        'http://api.test/api/restaurants/a%2Fb/ratings/mine/2026-03-07T21%3A30%3A00.123456%2B00%3A00',
      );
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(left);

      expect(await result).toEqual(left);
    });

    it('rethrows API errors so the page can explain them', async () => {
      const result = firstValueFrom(api.deleteMyRating('r1', '2026-03-07T21:30:00+00:00'));
      httpTesting
        .expectOne(
          'http://api.test/api/restaurants/r1/ratings/mine/2026-03-07T21%3A30%3A00%2B00%3A00',
        )
        .flush(null, { status: 404, statusText: 'Not Found' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 404 });
    });
  });

  describe('deleteMyRatings', () => {
    it('deletes every rating of the logged-in user, with the session cookie', async () => {
      const result = firstValueFrom(api.deleteMyRatings('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/restaurants/a%2Fb/ratings/mine');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);

      expect(await result).toEqual([]);
    });

    it('rethrows API errors so the page can explain them', async () => {
      const result = firstValueFrom(api.deleteMyRatings('r1'));
      httpTesting
        .expectOne('http://api.test/api/restaurants/r1/ratings/mine')
        .flush(null, { status: 503, statusText: 'Service Unavailable' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 503 });
    });
  });

  describe('fetchRatingAllowance', () => {
    it('asks whether the logged-in user can rate, with the session cookie', async () => {
      const allowance = { canRate: false, nextRatingAt: '2026-10-25T00:00:00+00:00' };

      const result = firstValueFrom(api.fetchRatingAllowance());
      const req = httpTesting.expectOne('http://api.test/api/users/me/rating-allowance');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(allowance);

      expect(await result).toEqual(allowance);
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

  describe('fetchFollowedRatings', () => {
    it('asks for the 5 most recent ratings of the users followed by default, with the session cookie', async () => {
      const ratings = [{ restaurantId: 'r1', userId: 'u2', userName: 'Camille' }];

      const result = firstValueFrom(api.fetchFollowedRatings());
      const req = httpTesting.expectOne('http://api.test/api/users/me/following/ratings?limit=5');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(ratings);

      expect(await result).toEqual(ratings);
    });

    it('sends the limit asked for', async () => {
      const result = firstValueFrom(api.fetchFollowedRatings(12));
      httpTesting.expectOne('http://api.test/api/users/me/following/ratings?limit=12').flush([]);

      expect(await result).toEqual([]);
    });
  });
});
