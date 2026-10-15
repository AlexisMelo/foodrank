import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { type PageAccess, sessionRedirect } from '@/core/utils/auth';
import { AuthStore } from './auth-store';

/**
 * Keeps each page to the users it is meant for (route data `access`, see sessionRedirect): logged-out users only see
 * the login, sign up and public pages, logged-in users are sent from the login and sign up pages to the home page.
 * The session is already checked when it runs: the app initializer waits for it before the first navigation.
 */
export const accessGuard: CanActivateFn = (route) => {
  const access = route.data['access'] as PageAccess | undefined;
  const target = sessionRedirect(access, inject(AuthStore).isLoggedIn());
  return target ? inject(Router).parseUrl(target) : true;
};
