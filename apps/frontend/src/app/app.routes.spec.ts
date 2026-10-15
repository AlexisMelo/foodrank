import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api/api-interceptor';
import { checkSession } from './core/auth/auth-testing';
import { unauthorizedInterceptor } from './core/auth/unauthorized-interceptor';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([apiInterceptor, unauthorizedInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('sends a logged-out user opening a private page to the login page', async () => {
    await checkSession(401);

    await RouterTestingHarness.create('/profile');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('sends a logged-in user opening the login page to the home page', async () => {
    await checkSession(200);

    await RouterTestingHarness.create('/login');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
