import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { type SignupStep, reachableSignupStep, signupStepRoute } from '@/core/utils/signup';
import { ForgotPasswordForm } from '../forgot-password-form/forgot-password-form';
import { LoginForm } from '../login-form/login-form';
import { SignupDraftStore } from '../signup-draft-store';
import { SignupForm } from '../signup-form/signup-form';
import { SignupPasswordStep } from '../signup/signup-password-step/signup-password-step';
import { SignupProfileStep } from '../signup/signup-profile-step/signup-profile-step';

/**
 * Login and sign up page (/login, /signup). Login and sign up are tabs of the same card; the sign up continues on
 * full pages (/signup?step=2, ?step=3).
 */
@Component({
  imports: [ForgotPasswordForm, LoginForm, SignupForm, SignupPasswordStep, SignupProfileStep],
  selector: 'app-auth',
  styleUrl: './auth.scss',
  templateUrl: './auth.html',
})
export class Auth {
  /** True on /signup (route data), undefined on /login */
  readonly signup = input<boolean>();
  /** ?step query of the sign up, undefined when there is none */
  readonly step = input<unknown>();

  /** Changes the URL when switching tab or step */
  private readonly router = inject(Router);
  /** Sign up being filled, which decides the steps that can be shown */
  private readonly draft = inject(SignupDraftStore).draft;

  /** Sign up step shown on /signup (kept valid by the step guard), null on /login. */
  protected readonly signupStep = computed(() =>
    this.signup() ? reachableSignupStep(this.step(), this.draft()) : null,
  );

  /** True while the login tab shows the forgot password form. */
  protected readonly showForgot = signal(false);

  // Login and sign up are tabs of the same card: switching replaces the URL instead of adding a history entry
  /** Opens the login tab. */
  protected goToLogin(): void {
    this.showForgot.set(false);
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /** Opens the sign up tab, on its first step. */
  protected goToSignup(): void {
    this.openSignupStep(1, true);
  }

  /** Opens the next sign up step, as a new history entry. */
  protected goToSignupStep(step: SignupStep): void {
    this.openSignupStep(step, false);
  }

  /** Navigates to the URL of the sign up `step`. */
  private openSignupStep(step: SignupStep, replaceUrl: boolean): void {
    const { path, query } = signupStepRoute(step);
    void this.router.navigate([path], { queryParams: query, replaceUrl });
  }
}
