/**
 * Who can open a page (route meta `access`): 'guest' for logged-out users only (login, sign up), 'public' for
 * everyone (reset password). Pages without access are for logged-in users only.
 */
export type PageAccess = 'guest' | 'public';

/**
 * Page to open instead of a page with `access` when the user cannot see it: the login page for a logged-out user on
 * a private page, the home page for a logged-in user on a guest page. Undefined when the user can see it.
 */
export function sessionRedirect(
  access: PageAccess | undefined,
  isLoggedIn: boolean,
): string | undefined {
  if (access === 'public') return undefined;
  if (access === 'guest') return isLoggedIn ? '/' : undefined;
  return isLoggedIn ? undefined : '/login';
}
