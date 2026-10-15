import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { checkSession, configureAuthTesting } from './auth-testing';
import { AuthStore } from './auth-store';

describe('unauthorizedInterceptor', () => {
  let store: AuthStore;
  let router: Router;
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    configureAuthTesting();
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  /**
   * Sends an API request, the API answering it with the error `status` (0 for a network error).
   */
  function failApiCall(status: number): Promise<unknown> {
    const result = firstValueFrom(http.get('/api/users/me'));
    const req = httpTesting.expectOne('/api/users/me');
    if (status === 0) req.error(new ProgressEvent('error'));
    else req.flush(null, { status, statusText: 'Error' });
    return result;
  }

  it('shows the login page when the API rejects the expired session', async () => {
    await checkSession(200);
    const harness = await RouterTestingHarness.create('/profile');

    // The error still reaches the caller
    await expect(failApiCall(401)).rejects.toMatchObject({ status: 401 });
    await harness.fixture.whenStable();

    expect(store.isLoggedIn()).toBe(false);
    expect(router.url).toBe('/login');
  });

  it.each([
    ['guest', '/login'],
    ['public', '/auth/reset-password'],
  ])(
    'stays on a %s page when the API answers 401, so the page can show its error',
    async (_access, url) => {
      await checkSession(401);
      const harness = await RouterTestingHarness.create(url);

      await expect(failApiCall(401)).rejects.toMatchObject({ status: 401 });
      await harness.fixture.whenStable();

      expect(router.url).toBe(url);
    },
  );

  it('lets the guard choose the first page when the session check is refused', async () => {
    // The 401 of the session check arrives before the first navigation is done, while the current route is still
    // the router's start location (a private page): it must not send the page being opened, e.g. the public reset
    // password page, to the login page
    const navigate = vi.spyOn(router, 'navigateByUrl');

    await checkSession(401);
    expect(navigate).not.toHaveBeenCalled();

    await RouterTestingHarness.create('/auth/reset-password');
    expect(router.url).toBe('/auth/reset-password');
  });

  it('stays logged in when an API call fails for another reason', async () => {
    await checkSession(200);
    const harness = await RouterTestingHarness.create('/profile');

    await expect(failApiCall(500)).rejects.toMatchObject({ status: 500 });
    await expect(failApiCall(0)).rejects.toMatchObject({ status: 0 });
    await harness.fixture.whenStable();

    expect(store.isLoggedIn()).toBe(true);
    expect(router.url).toBe('/profile');
  });
});
