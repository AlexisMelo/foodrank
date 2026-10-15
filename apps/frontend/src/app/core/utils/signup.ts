import type { Identity, SignupData, SignupDraft } from '@/core/models/user.model';

/** Sign up steps: 1 email (on the login card), 2 password, 3 personal data. */
export type SignupStep = 1 | 2 | 3;

/** Number of sign up steps, for the progress bar. */
export const SIGNUP_STEP_COUNT = 3;

// Same rules as the API (SignupRequest, StrongPasswordAttribute)

/** Minimum length of a password */
export const PASSWORD_MIN_LENGTH = 8;
/** Minimum length of a pseudonym, once trimmed */
export const USERNAME_MIN_LENGTH = 3;
/** Maximum length of a pseudonym, once trimmed */
export const USERNAME_MAX_LENGTH = 30;
/** Maximum age in years */
export const MAX_AGE = 120;

/** Identities offered when signing up, with their label. */
export const IDENTITIES: readonly {
  /** Value sent to the API */
  value: Identity;
  /** Text shown to the user */
  label: string;
}[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
];

/** A password rule shown on the password step, and whether the password follows it. */
export interface PasswordCriterion {
  /** Rule as shown to the user, e.g. "At least 1 number" */
  label: string;
  /** True when the password follows the rule */
  met: boolean;
}

/**
 * Rules a password must follow, each with whether `password` follows it. Any alphabet counts as a letter (é, ß...),
 * only 0-9 count as numbers.
 */
export function passwordCriteria(password: string): PasswordCriterion[] {
  return [
    {
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { label: 'At least 1 letter', met: /\p{L}/u.test(password) },
    { label: 'At least 1 number', met: /[0-9]/.test(password) },
  ];
}

/** True when `password` follows every rule of {@link passwordCriteria}. */
export function isValidPassword(password: string): boolean {
  return passwordCriteria(password).every((criterion) => criterion.met);
}

/** True when `username`, once trimmed, has an allowed length. */
export function isValidUsername(username: string): boolean {
  const length = username.trim().length;
  return length >= USERNAME_MIN_LENGTH && length <= USERNAME_MAX_LENGTH;
}

/** True when `age` is a whole number from 0 to {@link MAX_AGE}. */
export function isValidAge(age: number | ''): age is number {
  return Number.isInteger(age) && (age as number) >= 0 && (age as number) <= MAX_AGE;
}

/**
 * Body of the sign up request built from `draft`, with the pseudonym trimmed. Null while the personal data is
 * missing or invalid.
 */
export function toSignupData(draft: SignupDraft): SignupData | null {
  const username = draft.username.trim();
  if (!isValidUsername(username) || !isValidAge(draft.age) || draft.identity === '') return null;

  return {
    email: draft.email,
    password: draft.password,
    username,
    age: draft.age,
    identity: draft.identity,
  };
}

/**
 * Step to show for the `?step=` query `requested`: the steps open in order, so a step whose previous ones are not
 * filled in `draft` (e.g. after a reload, the draft being kept in memory only) falls back to the first one missing.
 * Anything but 1, 2 or 3 gives the first step.
 */
export function reachableSignupStep(
  requested: unknown,
  draft: Pick<SignupDraft, 'email' | 'password'>,
): SignupStep {
  const step = requested === '2' ? 2 : requested === '3' ? 3 : 1;
  if (step >= 2 && !draft.email.trim()) return 1;
  if (step === 3 && !isValidPassword(draft.password)) return 2;
  return step;
}

/** Route of a sign up step: /signup?step=N. */
export function signupStepRoute(step: SignupStep) {
  return { path: '/signup', query: { step: String(step) } };
}
