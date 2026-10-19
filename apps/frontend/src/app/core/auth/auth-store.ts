import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { SignupData } from '@/core/models/user.model';
import { type PageAccess, sessionRedirect } from '@/core/utils/auth';

/**
 * Marks the session check request: its 401 means the user is logged out, not that their session was rejected, so
 * unauthorizedInterceptor leaves it to the guard. It arrives before the first navigation is done, while the current
 * route is not the page being opened yet: leaving that route would send e.g. the reset password page to the login page.
 */
export const SESSION_CHECK = new HttpContextToken<boolean>(() => false);

/**
 * Body of POST /api/auth/reset-password: the tokens of the reset password link and the new password.
 */
export interface PasswordReset {
  /**
   * access_token of the link
   */
  accessToken: string;

  /**
   * refresh_token of the link
   */
  refreshToken: string;

  /**
   * New password
   */
  password: string;
}

/**
 * Body of GET /api/auth/me: the user logged in by the session cookie.
 */
interface SessionUser {
  /**
   * Id of the logged-in user, the same as UserProfile.id and the userId of their ratings and tierlists
   */
  id: string;
}

/**
 * Session of the user: whether they are logged in, and the actions that log them in or out.
 */
@Service()
export class AuthStore {
  /**
   * Sends the auth requests to the API
   */
  private readonly http = inject(HttpClient);

  /**
   * Opens the page matching the session after each action
   */
  private readonly router = inject(Router);

  /**
   * Writable state behind loggedInUserId and isLoggedIn: null when logged out
   */
  private readonly sessionUserId = signal<string | null>(null);

  /**
   * Id of the logged-in user, from GET /api/auth/me; null when logged out. Known once checkSession has run (app
   * initializer), and again after a login or a sign up
   */
  readonly loggedInUserId = this.sessionUserId.asReadonly();

  /**
   * True when the API accepts the session; known once checkSession has run (app initializer)
   */
  readonly isLoggedIn = computed(() => this.sessionUserId() !== null);

  /**
   * Check if the user is currently logged in, and who they are, by making a request to the backend. Never throws: a
   * failed check means logged out.
   */
  async checkSession(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<SessionUser>('/api/auth/me', {
          context: new HttpContext().set(SESSION_CHECK, true),
        }),
      );
      this.sessionUserId.set(user.id);
    } catch {
      this.sessionUserId.set(null);
    }
  }

  /**
   * Sign in the user using email & password, then open the home page
   */
  async login(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/login', { email, password }));
    await this.enterApp();
  }

  /**
   * Create the account with everything entered in the sign up steps, then open the home page
   */
  async signup(data: SignupData): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/signup', data));
    await this.enterApp();
  }

  /**
   * Log out, then open the login page
   */
  async logout(): Promise<void> {
    this.sessionUserId.set(null);
    await this.leaveForbiddenPage();
    await firstValueFrom(this.http.post('/api/auth/logout', null)).catch(() => undefined);
  }

  /**
   * Delete the account of the logged-in user with all its data, once its password is confirmed, then open the login
   * page. Rethrows when the deletion fails (e.g. 403 for a wrong password), the user then stays logged in.
   * @param password current password of the user
   */
  async deleteAccount(password: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/delete-account', { password }));
    this.sessionUserId.set(null);
    await this.leaveForbiddenPage();
  }

  /**
   * Ask the API to email a reset password link to `email`; it answers the same whether the account exists or not
   * @throws the HttpErrorResponse when the request fails
   */
  async requestPasswordReset(email: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/forgot-password', { email }));
  }

  /**
   * Set a new password with the tokens of a reset password link. The session is not checked again here.
   * @throws the HttpErrorResponse when the reset fails, e.g. the link expired
   */
  async resetPassword(reset: PasswordReset): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/reset-password', reset));
  }

  /**
   * Show the login page as soon as the API rejects the session (e.g. the token expired while the app was open),
   * instead of leaving pages that cannot load their data. Login, sign up and public pages are left as they are, so
   * they can show their own error.
   */
  async sessionRejected(): Promise<void> {
    this.sessionUserId.set(null);
    await this.leaveForbiddenPage();
  }

  /**
   * Show the app, then open the home page. The session is checked again first, so the id of the user is known
   * and the access guard lets the home page open; the login or sign up page stays displayed until then. Should that
   * check fail, the user stays logged out and the guard keeps them on the login page.
   */
  private async enterApp(): Promise<void> {
    await this.checkSession();
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  /**
   * Leave the current page when the session does not allow it anymore: a private page after a logout or an expired
   * session goes to the login page.
   */
  private async leaveForbiddenPage(): Promise<void> {
    let page = this.router.routerState.snapshot.root;
    while (page.firstChild) page = page.firstChild;

    const target = sessionRedirect(
      page.data['access'] as PageAccess | undefined,
      this.isLoggedIn(),
    );
    if (target) await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
