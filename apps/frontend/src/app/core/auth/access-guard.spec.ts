import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus, inject, provideAppInitializer } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { checkSession, configureAuthTesting } from './auth-testing';
import { AuthStore } from './auth-store';

describe('accessGuard', () => {
  let harness: RouterTestingHarness;

  /** URL shown once `url` is opened, after the guard's redirection if any. */
  async function open(url: string): Promise<string> {
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('sends a logged-out user from a private page to the login page', async () => {
    configureAuthTesting();
    await checkSession(401);
    harness = await RouterTestingHarness.create();

    expect(await open('/profile')).toBe('/login');
    expect(await open('/login')).toBe('/login');
    expect(await open('/auth/reset-password')).toBe('/auth/reset-password');
  });

  it('sends a logged-in user from the login and sign up pages to the home page', async () => {
    configureAuthTesting();
    await checkSession(200);
    harness = await RouterTestingHarness.create();

    expect(await open('/login')).toBe('/');
    expect(await open('/profile')).toBe('/profile');
    expect(await open('/auth/reset-password')).toBe('/auth/reset-password');
  });

  it('waits for the session check before choosing the first page', async () => {
    // Same initializer as app.config.ts
    configureAuthTesting([provideAppInitializer(() => inject(AuthStore).checkSession())]);
    const initStatus = TestBed.inject(ApplicationInitStatus);

    expect(initStatus.done).toBe(false);
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush({});
    await initStatus.donePromise;
    harness = await RouterTestingHarness.create();

    expect(await open('/login')).toBe('/');
  });

  it('follows the session once logged out', async () => {
    configureAuthTesting();
    await checkSession(200);
    harness = await RouterTestingHarness.create('/profile');

    const loggedOut = TestBed.inject(AuthStore).logout();
    const req = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne('/api/auth/logout'),
    );
    req.flush({});
    await loggedOut;

    expect(await open('/settings')).toBe('/login');
  });
});
