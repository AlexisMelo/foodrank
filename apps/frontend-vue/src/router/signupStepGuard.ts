import type { RouteLocationNormalized } from 'vue-router'
import { useSignupDraft } from '@/composables/useSignupDraft'
import { reachableSignupStep, signupStepRoute } from '@/utils/signup'

/**
 * Keeps the URL of the sign up on the step shown (/signup?step=1 for the first one), and the steps in order: a step
 * whose previous ones are not filled redirects to the first one missing (see reachableSignupStep).
 */
export function signupStepGuard(to: RouteLocationNormalized) {
  if (to.path !== '/signup') return true

  const step = reachableSignupStep(to.query.step, useSignupDraft().draft)
  return to.query.step === String(step) || signupStepRoute(step)
}
