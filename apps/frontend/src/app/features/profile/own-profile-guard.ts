import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';

/**
 * Sends /user/:id to /profile when :id is the logged-in user (e.g. the owner link of their own tierlist), so their
 * profile has a single URL and is always shown as their own: no "my score", no rate buttons, no second request of
 * their ratings.
 */
export const ownProfileGuard: CanActivateFn = (route) =>
  route.params['id'] === inject(AuthStore).loggedInUserId()
    ? inject(Router).parseUrl('/profile')
    : true;
