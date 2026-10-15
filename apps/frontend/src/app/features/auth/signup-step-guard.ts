import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { reachableSignupStep, signupStepRoute } from '@/core/utils/signup';
import { SignupDraftStore } from './signup-draft-store';

/**
 * Keeps the URL of the sign up on the step shown (/signup?step=1 for the first one), and the steps in order: a step
 * whose previous ones are not filled redirects to the first one missing (see reachableSignupStep).
 * The /signup route runs it on query changes too (runGuardsAndResolvers), since the steps only differ by ?step.
 */
export const signupStepGuard: CanActivateFn = (route) => {
  const requested: unknown = route.queryParams['step'];
  const step = reachableSignupStep(requested, inject(SignupDraftStore).draft());
  if (requested === String(step)) return true;

  const { path, query } = signupStepRoute(step);
  return inject(Router).createUrlTree([path], { queryParams: query });
};
