import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SIGNUP_STEP_COUNT, type SignupStep, signupStepRoute } from '@/core/utils/signup';

/** Full page layout of the sign up steps 2 and 3: back arrow, progress bar, title, and the step's form projected. */
@Component({
  imports: [RouterLink],
  selector: 'app-signup-step-layout',
  styleUrl: './signup-step-layout.scss',
  templateUrl: './signup-step-layout.html',
})
export class SignupStepLayout {
  /** Step shown, for the label and the progress bar */
  readonly step = input.required<SignupStep>();
  /** Title of the step */
  readonly title = input.required<string>();
  /** Route opened by the back arrow */
  readonly backTo = input.required<ReturnType<typeof signupStepRoute>>();

  /** Number of steps, for the progress bar */
  protected readonly stepCount = SIGNUP_STEP_COUNT;
  /** Width of the progress bar fill, in % */
  protected readonly progress = computed(() => (this.step() / SIGNUP_STEP_COUNT) * 100);
}
