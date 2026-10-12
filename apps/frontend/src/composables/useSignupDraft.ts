import { reactive } from 'vue'
import type { SignupDraft } from '@/types/user'

function emptyDraft(): SignupDraft {
  return { email: '', password: '', username: '', age: '', identity: '' }
}

// Shared by the sign up steps, so going back and forth keeps what was entered. Kept in memory only: the password is
// never stored, and a reload starts the sign up over.
const draft = reactive<SignupDraft>(emptyDraft())

/** Empties the draft, once the account is created. */
function resetDraft() {
  Object.assign(draft, emptyDraft())
}

export function useSignupDraft() {
  return { draft, resetDraft }
}
