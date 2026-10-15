import { Component, inject, output } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { SignupDraftStore } from '../signup-draft-store';

/**
 * Sign up tab of the auth card (step 1): the email, written to the sign up draft.
 */
@Component({
  imports: [FormField],
  selector: 'app-signup-form',
  styleUrl: './signup-form.scss',
  templateUrl: './signup-form.html',
})
export class SignupForm {
  /**
   * The Sign in tab is clicked
   */
  readonly goToLogin = output<void>();

  /**
   * The email is entered: open the password step
   */
  readonly continue = output<void>();

  /**
   * Sign up being filled, where the email is written
   */
  private readonly draft = inject(SignupDraftStore).draft;

  /**
   * The email field of the draft, required (the browser checks its format, as in the Vue app)
   */
  protected readonly form = form(this.draft, (draft) => {
    required(draft.email);
  });

  /**
   * Keeps the trimmed email, then opens the password step.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.draft.update((draft) => ({ ...draft, email: draft.email.trim() }));
    this.continue.emit();
  }
}
