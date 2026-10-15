import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { apiInterceptor } from '@/core/api/api-interceptor';
import { accessGuard } from './access-guard';
import { AuthStore } from './auth-store';
import { unauthorizedInterceptor } from './unauthorized-interceptor';

// Test helpers shared by the auth specs

/**
 * Empty page standing for the real pages of the app, which the auth tests do not need.
 */
@Component({ template: '' })
class StubPage {}

/**
 * A guest, a public and a few private pages, each behind the access guard.
 */
const routes: Routes = [
  { path: 'login', component: StubPage, canActivate: [accessGuard], data: { access: 'guest' } },
  { path: 'signup', component: StubPage, canActivate: [accessGuard], data: { access: 'guest' } },
  {
    path: 'auth/reset-password',
    component: StubPage,
    canActivate: [accessGuard],
    data: { access: 'public' },
  },
  { path: '', pathMatch: 'full', component: StubPage, canActivate: [accessGuard] },
  { path: 'profile', component: StubPage, canActivate: [accessGuard] },
  { path: 'settings', component: StubPage, canActivate: [accessGuard] },
];

/**
 * Sets up the router with the test pages and HttpClient with the app interceptors, its backend faked.
 */
export function configureAuthTesting(providers: (Provider | EnvironmentProviders)[] = []): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(withInterceptors([apiInterceptor, unauthorizedInterceptor])),
      provideHttpClientTesting(),
      ...providers,
    ],
  });
}

/**
 * Runs the session check done when the app starts, the API answering it with `status`.
 */
export async function checkSession(status: 200 | 401): Promise<void> {
  const checked = TestBed.inject(AuthStore).checkSession();
  const req = TestBed.inject(HttpTestingController).expectOne('/api/auth/me');
  if (status === 200) req.flush({});
  else req.flush(null, { status, statusText: 'Unauthorized' });
  await checked;
}
