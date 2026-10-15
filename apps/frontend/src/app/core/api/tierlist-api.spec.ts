import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import type { Tierlist } from '@/core/models/tierlist.model';
import { API_URL, apiInterceptor } from './api-interceptor';
import { TierlistApi } from './tierlist-api';

/**
 * Builds a tierlist of the API.
 */
function tierlist(id: number, pinned = false): Tierlist {
  return {
    id,
    userId: 'u1',
    name: `Tierlist ${id}`,
    description: null,
    emoji: '🏆',
    restaurants: [],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned,
  };
}

describe('TierlistApi', () => {
  let api: TierlistApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test' },
      ],
    });
    api = TestBed.inject(TierlistApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('createTierlist', () => {
    it('posts the tierlist with the session cookie', async () => {
      const tierlist = { emoji: '🍕', name: 'Best pizzas', description: null, pinned: true };

      const result = firstValueFrom(api.createTierlist(tierlist));
      const req = httpTesting.expectOne('http://api.test/api/tierlists');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(tierlist);
      expect(req.request.withCredentials).toBe(true);
      req.flush({});

      await result;
    });

    it('rethrows API errors so the page can explain them', async () => {
      const result = firstValueFrom(
        api.createTierlist({ emoji: '🏆', name: 'Top 10', description: null, pinned: false }),
      );
      httpTesting
        .expectOne('http://api.test/api/tierlists')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 401 });
    });
  });

  describe('fetchTierlistsByUserId', () => {
    it("gets the logged-in user's tierlists by default, with the session cookie", async () => {
      const tierlists = [tierlist(2), tierlist(1)];

      const result = firstValueFrom(api.fetchTierlistsByUserId());
      const req = httpTesting.expectOne('http://api.test/api/users/me/tierlists');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(tierlists);

      expect(await result).toEqual(tierlists);
    });

    it('gets the tierlists of another user, encoding its id', async () => {
      const result = firstValueFrom(api.fetchTierlistsByUserId('a/b'));
      const req = httpTesting.expectOne('http://api.test/api/users/a%2Fb/tierlists');
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);

      await result;
    });
  });

  describe('fetchTierlistById', () => {
    it('gets the tierlist with the session cookie', async () => {
      const result = firstValueFrom(api.fetchTierlistById('7'));
      const req = httpTesting.expectOne('http://api.test/api/tierlists/7');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(tierlist(7));

      expect(await result).toEqual(tierlist(7));
    });

    it('returns undefined for an unknown tierlist', async () => {
      const result = firstValueFrom(api.fetchTierlistById('42'));
      httpTesting
        .expectOne('http://api.test/api/tierlists/42')
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(await result).toBeUndefined();
    });

    it('rethrows the other API errors', async () => {
      const result = firstValueFrom(api.fetchTierlistById('7'));
      httpTesting
        .expectOne('http://api.test/api/tierlists/7')
        .flush(null, { status: 503, statusText: 'Service Unavailable' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 503 });
    });
  });

  describe('fetchPinnedTierlistsByUserId', () => {
    it('keeps only the pinned tierlists of the user', async () => {
      const result = firstValueFrom(api.fetchPinnedTierlistsByUserId('u1'));
      const req = httpTesting.expectOne('http://api.test/api/users/u1/tierlists');
      expect(req.request.withCredentials).toBe(true);
      req.flush([tierlist(3, true), tierlist(2), tierlist(1, true)]);

      expect((await result).map((t) => t.id)).toEqual([3, 1]);
    });
  });

  describe('setTierlistPinned', () => {
    it('puts the pinned flag with the session cookie, and returns the updated tierlist', async () => {
      const result = firstValueFrom(api.setTierlistPinned(7, true));
      const req = httpTesting.expectOne('http://api.test/api/tierlists/7/pinned');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ pinned: true });
      expect(req.request.withCredentials).toBe(true);
      req.flush(tierlist(7, true));

      expect(await result).toEqual(tierlist(7, true));
    });

    it('rethrows API errors, like a tierlist of another user', async () => {
      const result = firstValueFrom(api.setTierlistPinned(7, false));
      httpTesting
        .expectOne('http://api.test/api/tierlists/7/pinned')
        .flush(null, { status: 403, statusText: 'Forbidden' });

      await expect(result).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 403 });
    });
  });
});
