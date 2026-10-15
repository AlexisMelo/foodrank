import { Service, signal } from '@angular/core';
import type { SignupDraft } from '@/core/models/user.model';

/** A draft with nothing entered yet. */
function emptyDraft(): SignupDraft {
  return { email: '', password: '', username: '', age: null, identity: '' };
}

/**
 * Sign up being filled, shared by the sign up steps so going back and forth keeps what was entered. Kept in memory
 * only: the password is never stored, and a reload starts the sign up over.
 */
@Service()
export class SignupDraftStore {
  /**
   * What was entered so far. Writable, unlike the state of the other stores: the Signal Forms of the steps take it
   * as their model and write each field to it as it is typed.
   */
  readonly draft = signal<SignupDraft>(emptyDraft());

  /** Empties the draft, once the account is created. */
  reset(): void {
    this.draft.set(emptyDraft());
  }
}
