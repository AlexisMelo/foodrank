import { Component, computed, inject, output } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { isValidPassword, signupStepRoute } from '@/core/utils/signup';
import { SignupDraftStore } from '../../signup-draft-store';
import { PasswordCriteria } from '../password-criteria/password-criteria';
import { SignupStepLayout } from '../signup-step-layout/signup-step-layout';

/**
 * Sign up step 2: the password, with its rules ticked while it is typed.
 */
@Component({
  imports: [FormField, PasswordCriteria, SignupStepLayout],
  selector: 'app-signup-password-step',
  styleUrl: './signup-password-step.scss',
  templateUrl: './signup-password-step.html',
})
export class SignupPasswordStep {
  /**
   * The password follows the rules: open the personal data step
   */
  readonly continue = output<void>();

  /**
   * Sign up being filled, where the password is written
   */
  protected readonly draft = inject(SignupDraftStore).draft;

  /**
   * The password field of the draft, valid once it follows every rule of passwordCriteria
   */
  protected readonly form = form(this.draft, (draft) => {
    required(draft.password);
    validate(draft.password, ({ value }) =>
      isValidPassword(value()) ? undefined : { kind: 'password' },
    );
  });

  /**
   * Route of the email step, opened by the back arrow
   */
  protected readonly backTo = signupStepRoute(1);

  /**
   * True once the password follows every rule
   */
  protected readonly canContinue = computed(() => this.form.password().valid());

  /**
   * Opens the next step when the password is valid.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    if (this.canContinue()) this.continue.emit();
  }
}
