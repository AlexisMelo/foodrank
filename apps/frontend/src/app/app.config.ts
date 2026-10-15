import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api/api-interceptor';
import { AuthStore } from './core/auth/auth-store';
import { unauthorizedInterceptor } from './core/auth/unauthorized-interceptor';

/** Providers of the whole app, given to bootstrapApplication in main.ts. */
export const appConfig: ApplicationConfig = {
  /** Router (route params and query given to the pages as inputs), HttpClient with the API interceptors, and the session check run before the first page */
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor, unauthorizedInterceptor])),
    // The first page is chosen once the session is known (see accessGuard)
    provideAppInitializer(() => inject(AuthStore).checkSession()),
  ],
};
