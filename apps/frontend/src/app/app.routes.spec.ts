import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api/api-interceptor';
import { SESSION_USER_ID, checkSession } from './core/auth/auth-testing';
import { unauthorizedInterceptor } from './core/auth/unauthorized-interceptor';
import { query, textOf } from './testing/dom-testing';

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

  it('shows a "page not found" page for an unknown URL, with a link to the home page', async () => {
    await checkSession(200);

    const harness = await RouterTestingHarness.create('/foo/bar');
    // The app layout loads the city searches are centered on as soon as it opens
    TestBed.inject(HttpTestingController)
      .expectOne('/api/places/area')
      .flush({ locality: 'Lyon', isDefault: true });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/foo/bar');
    expect(textOf(query(harness.fixture, 'h1'))).toBe('Page not found');
    expect(query(harness.fixture, '.home-link').getAttribute('href')).toBe('/');
  });

  it('opens the community page and its friends page', async () => {
    await checkSession(200);
    const httpTesting = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create('/community');
    httpTesting.expectOne('/api/places/area').flush({ locality: 'Lyon', isDefault: true });
    httpTesting.expectOne(`/api/users/${SESSION_USER_ID}/friends`).flush([]);
    httpTesting.expectOne('/api/users/me/following/ratings?limit=5').flush([]);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/community');
    expect(textOf(query(harness.fixture, 'h1'))).toBe('Community');

    await harness.navigateByUrl('/community/friends');
    httpTesting.expectOne(`/api/users/${SESSION_USER_ID}/friends`).flush([]);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/community/friends');
    expect(textOf(query(harness.fixture, 'h1'))).toBe('Friends');
  });

  it('sends a logged-out user opening an unknown URL to the login page', async () => {
    await checkSession(401);

    await RouterTestingHarness.create('/foo');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
