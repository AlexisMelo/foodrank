import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_URL, apiInterceptor } from './api-interceptor';
import { UserApi } from './user-api';

describe('UserApi', () => {
  let api: UserApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test' },
      ],
    });
    api = TestBed.inject(UserApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('fetchUserProfile', () => {
    it("returns the logged-in user's profile by default, sending the session cookie", async () => {
      const profile = { id: 'u1', name: 'Alexis', avatarUrl: null, ratedRestaurantsCount: 3 };

      const result = firstValueFrom(api.fetchUserProfile());
      const req = httpTesting.expectOne('http://api.test/api/users/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(profile);

      expect(await result).toEqual(profile);
    });

    it('reads another user by id, encoded in the url', async () => {
      const result = firstValueFrom(api.fetchUserProfile('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/users/a%2Fb');
      expect(req.request.withCredentials).toBe(true);
      req.flush({});

      await result;
    });

    it('returns undefined when the user does not exist', async () => {
      const result = firstValueFrom(api.fetchUserProfile('unknown'));
      httpTesting
        .expectOne('http://api.test/api/users/unknown')
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(await result).toBeUndefined();
    });

    it('rethrows other errors', async () => {
      const result = firstValueFrom(api.fetchUserProfile());
      httpTesting
        .expectOne('http://api.test/api/users/me')
        .flush(null, { status: 503, statusText: 'Service Unavailable' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 503 });
    });
  });

  describe('searchUsers', () => {
    it('sends the query encoded, with the session cookie, and returns the profiles found', async () => {
      const camille = { id: 'u2', name: 'Camille', avatarUrl: null, ratedRestaurantsCount: 1 };

      const result = firstValueFrom(api.searchUsers('cam & co'));
      const req = httpTesting.expectOne('http://api.test/api/users/search?query=cam%20%26%20co');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush([camille]);

      expect(await result).toEqual([camille]);
    });
  });
});
