import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { SignupData, User } from '@/core/models/user.model';
import { type PageAccess, sessionRedirect } from '@/core/utils/auth';

/** Id of the user in the community mock data, hardcoded until the API serves the community visits */
const CURRENT_USER_ID = 'alex';

/**
 * Marks the session check request: its 401 means the user is logged out, not that their session was rejected, so
 * unauthorizedInterceptor leaves it to the guard. It arrives before the first navigation is done, while the current
 * route is not the page being opened yet: leaving that route would send e.g. the reset password page to the login page.
 */
export const SESSION_CHECK = new HttpContextToken<boolean>(() => false);

/** Session of the user: whether they are logged in, and the actions that log them in or out. */
@Service()
export class AuthStore {
  /** Sends the auth requests to the API */
  private readonly http = inject(HttpClient);
  /** Opens the page matching the session after each action */
  private readonly router = inject(Router);

  /** Writable state behind isLoggedIn */
  private readonly loggedIn = signal(false);
  /** Writable state behind currentUser */
  private readonly user = signal<User | null>(null);

  /** True when the API accepts the session; known once checkSession has run (app initializer) */
  readonly isLoggedIn = this.loggedIn.asReadonly();
  /** Logged-in user; never set yet, always null (as in the Vue app) */
  readonly currentUser = this.user.asReadonly();
  /** Id of the user in the community mock data, not the id of the logged-in user */
  readonly currentUserId = CURRENT_USER_ID;

  /**
   * Check if the user is currently logged in by making a request to the backend.
   */
  async checkSession(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get('/api/auth/me', { context: new HttpContext().set(SESSION_CHECK, true) }),
      );
      this.loggedIn.set(true);
    } catch {
      this.loggedIn.set(false);
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
    this.loggedIn.set(false);
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
    this.loggedIn.set(false);
    await this.leaveForbiddenPage();
  }

  /**
   * Show the login page as soon as the API rejects the session (e.g. the token expired while the app was open),
   * instead of leaving pages that cannot load their data. Login, sign up and public pages are left as they are, so
   * they can show their own error.
   */
  async sessionRejected(): Promise<void> {
    this.loggedIn.set(false);
    await this.leaveForbiddenPage();
  }

  /**
   * Show the app, then open the home page. Logged in first, so the access guard lets the home page open; the
   * login or sign up page stays displayed until then.
   */
  private async enterApp(): Promise<void> {
    this.loggedIn.set(true);
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  /**
   * Leave the current page when the session does not allow it anymore: a private page after a logout or an expired
   * session goes to the login page.
   */
  private async leaveForbiddenPage(): Promise<void> {
    let page = this.router.routerState.snapshot.root;
    while (page.firstChild) page = page.firstChild;

    const target = sessionRedirect(page.data['access'] as PageAccess | undefined, this.loggedIn());
    if (target) await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
