import { Routes } from '@angular/router';
import { accessGuard } from './core/auth/access-guard';
import { Auth } from './features/auth/auth/auth';
import { signupStepGuard } from './features/auth/signup-step-guard';
import { Home } from './features/home/home/home';
import { ownProfileGuard } from './features/profile/own-profile-guard';
import { Shell } from './layout/shell/shell';

/**
 * Pages of the app. Login, sign up and reset password are shown without the
 * app navigation; the other pages are private and shown in the Shell, as is the page for an unknown URL. Who can open a page is declared in its data
 * `access` (see PageAccess) and checked by accessGuard.
 */
export const routes: Routes = [
  // Login and sign up are tabs of the same card; the sign up continues on full pages (?step=2, ?step=3)
  { path: 'login', component: Auth, canActivate: [accessGuard], data: { access: 'guest' } },
  {
    path: 'signup',
    component: Auth,
    canActivate: [accessGuard, signupStepGuard],
    // The sign up steps only differ by ?step: the guards must run again when it changes
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    data: { access: 'guest', signup: true },
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
    canActivate: [accessGuard],
    data: { access: 'public' },
  },
  {
    path: '',
    component: Shell,
    canActivate: [accessGuard],
    canActivateChild: [accessGuard],
    children: [
      { path: '', pathMatch: 'full', component: Home },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'explore',
        loadComponent: () => import('./features/explore/explore/explore').then((m) => m.Explore),
      },
      {
        path: 'community',
        loadComponent: () =>
          import('./features/community/community/community').then((m) => m.Community),
      },
      {
        path: 'community/friends',
        loadComponent: () => import('./features/community/friends/friends').then((m) => m.Friends),
      },
      {
        path: 'restaurant/:id',
        loadComponent: () =>
          import('./features/restaurant/restaurant-detail/restaurant-detail').then(
            (m) => m.RestaurantDetail,
          ),
      },
      {
        path: 'user/:id',
        loadComponent: () => import('./features/profile/profile/profile').then((m) => m.Profile),
        // The logged-in user's own id opens /profile
        canActivate: [ownProfileGuard],
      },
      {
        path: 'tierlists',
        loadComponent: () =>
          import('./features/tierlists/tierlists/tierlists').then((m) => m.Tierlists),
      },
      {
        path: 'tierlists/new',
        loadComponent: () =>
          import('./features/tierlists/tierlist-create/tierlist-create').then(
            (m) => m.TierlistCreate,
          ),
      },
      {
        path: 'tierlists/:id',
        loadComponent: () =>
          import('./features/tierlists/tierlist-detail/tierlist-detail').then(
            (m) => m.TierlistDetail,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search-results/search-results').then((m) => m.SearchResults),
      },
      {
        path: 'review/:id',
        loadComponent: () =>
          import('./features/review/new-review/new-review').then((m) => m.NewReview),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings/settings').then((m) => m.Settings),
      },
      // Any other URL; a logged-out user is sent to the login page by the guard of the Shell
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
