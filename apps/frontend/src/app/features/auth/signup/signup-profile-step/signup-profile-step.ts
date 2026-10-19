import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  disabled,
  form,
  max,
  maxLength,
  min,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { AuthStore } from '@/core/auth/auth-store';
import {
  IDENTITIES,
  MAX_AGE,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isValidAge,
  isValidUsername,
  signupStepRoute,
  toSignupData,
} from '@/core/utils/signup';
import { SignupDraftStore } from '../../signup-draft-store';
import { SignupStepLayout } from '../signup-step-layout/signup-step-layout';

/**
 * Body of an API error response.
 */
interface ApiError {
  /**
   * Explanation of the API, e.g. "This pseudonym is already taken."
   */
  error?: unknown;
}

/**
 * Message shown when the sign up fails: the API explains a 409 (email or pseudonym already used).
 */
function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const apiMessage: unknown = (error.error as ApiError | null)?.error;
    if (error.status === 409)
      return typeof apiMessage === 'string'
        ? apiMessage
        : 'This email or pseudonym is already used.';
    if (error.status === 400) return 'Some of your information was refused. Please check it.';
  }
  return 'Could not create account.';
}

/**
 * Sign up step 3: pseudonym, age and identity, then the account is created with everything entered.
 */
@Component({
  imports: [FormField, SignupStepLayout],
  selector: 'app-signup-profile-step',
  styleUrl: './signup-profile-step.scss',
  templateUrl: './signup-profile-step.html',
})
export class SignupProfileStep {
  /**
   * Creates the account
   */
  private readonly auth = inject(AuthStore);

  /**
   * Sign up being filled, emptied once the account is created
   */
  private readonly draftStore = inject(SignupDraftStore);

  /**
   * True while the sign up request runs: the fields and the button are disabled
   */
  protected readonly loading = signal(false);

  /**
   * Message of the last failed sign up, empty when there is none
   */
  protected readonly error = signal('');

  /**
   * Identities offered in the select
   */
  protected readonly identities = IDENTITIES;

  /**
   * Route of the password step, opened by the back arrow
   */
  protected readonly backTo = signupStepRoute(2);

  /**
   * Personal data fields of the draft, with the same rules as toSignupData (and the API)
   */
  protected readonly form = form(this.draftStore.draft, (draft) => {
    // minLength, maxLength, min and max also set the attributes of the native fields
    required(draft.username);
    minLength(draft.username, USERNAME_MIN_LENGTH);
    maxLength(draft.username, USERNAME_MAX_LENGTH);
    validate(draft.username, ({ value }) =>
      isValidUsername(value()) ? undefined : { kind: 'username' },
    );

    required(draft.age);
    min(draft.age, 0);
    max(draft.age, MAX_AGE);
    validate(draft.age, ({ value }) => (isValidAge(value()) ? undefined : { kind: 'age' }));

    required(draft.identity);

    disabled(draft.username, { when: () => this.loading() });
    disabled(draft.age, { when: () => this.loading() });
    disabled(draft.identity, { when: () => this.loading() });
  });

  /**
   * Explains an invalid pseudonym, empty while it is valid or empty (an empty form is not shown in error)
   */
  protected readonly usernameHint = computed(() => {
    const username = this.form.username();
    return username.value().trim() && username.invalid()
      ? `Between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
      : '';
  });

  /**
   * Explains an invalid age, empty while it is valid or empty (an empty form is not shown in error)
   */
  protected readonly ageHint = computed(() => {
    const age = this.form.age();
    return age.value() !== null && age.invalid() ? `Enter an age between 0 and ${MAX_AGE}.` : '';
  });

  /**
   * True while a field is missing or invalid: the Sign up button stays disabled
   */
  protected readonly incomplete = computed(() => toSignupData(this.draftStore.draft()) === null);

  /**
   * Creates the account, then empties the draft; explains the failure otherwise.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const data = toSignupData(this.draftStore.draft());
    if (!data) return;

    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.signup(data);
      this.draftStore.reset();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
