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
    it('sends the query encoded and the limit, with the session cookie, and returns the users found', async () => {
      const camille = { id: 'u2', name: 'Camille', avatarUrl: null };

      const result = firstValueFrom(api.searchUsers('cam & co', 15));
      const req = httpTesting.expectOne(
        'http://api.test/api/users/search?query=cam%20%26%20co&limit=15',
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ results: [camille], hasMore: true });

      expect(await result).toEqual({ results: [camille], hasMore: true });
    });
  });

  describe('follows', () => {
    /**
     * User answered by the follow endpoints
     */
    const camille = { id: 'u2', name: 'Camille', avatarUrl: null };

    it("reads a user's followers and the users they follow, the id encoded, with the session cookie", async () => {
      const followers = firstValueFrom(api.fetchFollowers('a/b'));
      const followersReq = httpTesting.expectOne('http://api.test/api/users/a%2Fb/followers');
      expect(followersReq.request.method).toBe('GET');
      expect(followersReq.request.withCredentials).toBe(true);
      followersReq.flush([camille]);

      const following = firstValueFrom(api.fetchFollowing('a/b'));
      const followingReq = httpTesting.expectOne('http://api.test/api/users/a%2Fb/following');
      expect(followingReq.request.method).toBe('GET');
      expect(followingReq.request.withCredentials).toBe(true);
      followingReq.flush([]);

      expect(await followers).toEqual([camille]);
      expect(await following).toEqual([]);
    });

    it("reads a user's friends, the id encoded, with the session cookie", async () => {
      const result = firstValueFrom(api.fetchFriends('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/users/a%2Fb/friends');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush([camille]);

      expect(await result).toEqual([camille]);
    });

    it('follows a user with a PUT without body, returning their followers', async () => {
      const result = firstValueFrom(api.follow('u3'));
      const req = httpTesting.expectOne('http://api.test/api/users/u3/follow');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush([camille]);

      expect(await result).toEqual([camille]);
    });

    it('unfollows a user with a DELETE, returning their followers', async () => {
      const result = firstValueFrom(api.unfollow('u3'));
      const req = httpTesting.expectOne('http://api.test/api/users/u3/follow');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);

      expect(await result).toEqual([]);
    });
  });
});
