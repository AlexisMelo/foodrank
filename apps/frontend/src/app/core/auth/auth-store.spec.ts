import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SignupData } from '@/core/models/user.model';
import { checkSession, configureAuthTesting } from './auth-testing';
import { AuthStore } from './auth-store';

const signupData: SignupData = {
  email: 'me@test.fr',
  password: 'abcdefg1',
  username: 'alex',
  age: 30,
  identity: 'non_binary',
};

describe('AuthStore', () => {
  let store: AuthStore;
  let router: Router;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    configureAuthTesting();
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('is logged in when the session check succeeds', async () => {
    const checked = store.checkSession();
    const req = httpTesting.expectOne('/api/auth/me');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
    await checked;

    expect(store.isLoggedIn()).toBe(true);
  });

  it('is logged out but ready when the session check fails', async () => {
    const checked = store.checkSession();
    httpTesting.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    // Resolves anyway: the app initializer waiting for it must not fail
    await expect(checked).resolves.toBeUndefined();
    expect(store.isLoggedIn()).toBe(false);
  });

  it('logs in on successful login', async () => {
    await checkSession(401);
    await RouterTestingHarness.create('/login');

    const done = store.login('me@test.fr', 'secret');
    httpTesting.expectOne('/api/auth/login').flush({});
    await done;

    expect(store.isLoggedIn()).toBe(true);
  });

  it('opens the home page on successful login, once logged in so the guard lets it open', async () => {
    await checkSession(401);
    await RouterTestingHarness.create('/login');
    const navigate = vi.spyOn(router, 'navigateByUrl');

    const done = store.login('me@test.fr', 'secret');
    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'me@test.fr', password: 'secret' });
    req.flush({});
    await done;

    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    // The home page is private: the guard would have sent a logged-out user back to the login page
    expect(router.url).toBe('/');
  });

  it('sends everything entered in the sign up steps, then opens the home page', async () => {
    await checkSession(401);
    await RouterTestingHarness.create('/signup');

    const done = store.signup(signupData);
    const req = httpTesting.expectOne('/api/auth/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(signupData);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
    await done;

    expect(router.url).toBe('/');
    expect(store.isLoggedIn()).toBe(true);
  });

  it('stays on the current page on failed signup', async () => {
    await checkSession(401);
    await RouterTestingHarness.create('/signup');

    const done = store.signup(signupData);
    httpTesting.expectOne('/api/auth/signup').flush(null, { status: 409, statusText: 'Conflict' });

    await expect(done).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 409 });
    expect(router.url).toBe('/signup');
    expect(store.isLoggedIn()).toBe(false);
  });

  it('does not navigate when the session check finds a session', async () => {
    const navigate = vi.spyOn(router, 'navigateByUrl');

    await checkSession(200);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('stays logged out and rethrows on failed login', async () => {
    await checkSession(401);
    await RouterTestingHarness.create('/login');

    const done = store.login('me@test.fr', 'wrong');
    httpTesting
      .expectOne('/api/auth/login')
      .flush(null, { status: 400, statusText: 'Bad Request' });

    await expect(done).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 400 });
    expect(router.url).toBe('/login');
    expect(store.isLoggedIn()).toBe(false);
  });

  it('logs out and opens the login page, even when the logout request fails', async () => {
    await checkSession(200);
    await RouterTestingHarness.create('/profile');

    const done = store.logout();
    const req = await vi.waitFor(() => httpTesting.expectOne('/api/auth/logout'));
    expect(req.request.withCredentials).toBe(true);
    req.error(new ProgressEvent('error'));
    await done;

    expect(store.isLoggedIn()).toBe(false);
    expect(router.url).toBe('/login');
  });

  it('deletes the account with the password, then logs out and opens the login page', async () => {
    await checkSession(200);
    await RouterTestingHarness.create('/settings');

    const done = store.deleteAccount('secret');
    const req = httpTesting.expectOne('/api/auth/delete-account');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ password: 'secret' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
    await done;

    expect(store.isLoggedIn()).toBe(false);
    expect(router.url).toBe('/login');
  });

  it('stays logged in and rethrows when the account deletion fails', async () => {
    await checkSession(200);
    await RouterTestingHarness.create('/settings');

    const done = store.deleteAccount('wrong');
    httpTesting
      .expectOne('/api/auth/delete-account')
      .flush(null, { status: 403, statusText: 'Forbidden' });

    await expect(done).rejects.toMatchObject({ name: 'HttpErrorResponse', status: 403 });
    expect(store.isLoggedIn()).toBe(true);
    expect(router.url).toBe('/settings');
  });
});
