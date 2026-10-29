import type {
  ProfileDetails,
  ProfileDetailsDraft,
  ProfileDetailsUpdate,
  UserSummary,
} from '@/core/models/user.model';
import { isValidAge } from './signup';

/**
 * Maximum length of a display name once trimmed, same as the API (SafeDisplayNameAttribute.MaxLength). Counted like
 * `string.length`, in UTF-16 code units: an emoji counts as 2
 */
export const DISPLAY_NAME_MAX_LENGTH = 30;

/**
 * Characters refused in a display name, as by the API (SafeDisplayNameAttribute): control characters (line breaks,
 * tabs...), invisible formatting ones (e.g. a right-to-left override) and line or paragraph separators, which could
 * break or disguise the name where it is shown
 */
const HIDDEN_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/**
 * Zero width joiner: a formatting character, still allowed since it joins emojis into one (👩 + 🍳 = 👩‍🍳)
 */
const ZERO_WIDTH_JOINER = String.fromCodePoint(0x200d);

/**
 * Label of a number of restaurants rated: "1 restaurant", "3 restaurants", "0 restaurants"
 */
export function restaurantCountLabel(count: number): string {
  return `${count} restaurant${count === 1 ? '' : 's'}`;
}

/**
 * Name shown for `user`: their display name, or their username when they have none
 */
export function displayedName(user: Pick<UserSummary, 'username' | 'displayName'>): string {
  return user.displayName ?? user.username;
}

/**
 * Display name sent for what was typed: trimmed, null when blank (the username is shown instead)
 */
export function normalizeDisplayName(typed: string): string | null {
  return typed.trim() || null;
}

/**
 * True when `typed`, once trimmed, has at most {@link DISPLAY_NAME_MAX_LENGTH} characters and no hidden character. Any
 * other text is allowed (any alphabet and case, numbers, spaces, punctuation, emojis), and so is a blank name.
 */
export function isValidDisplayName(typed: string): boolean {
  const name = typed.trim();
  return (
    name.length <= DISPLAY_NAME_MAX_LENGTH &&
    ![...name].some((c) => c !== ZERO_WIDTH_JOINER && HIDDEN_CHARACTER.test(c))
  );
}

/**
 * Fields of the edit profile page filled with `details`; empty while they are not loaded, and for the identity and age
 * of older accounts.
 */
export function toProfileDetailsDraft(details: ProfileDetails | undefined): ProfileDetailsDraft {
  return {
    displayName: details?.displayName ?? '',
    identity: details?.identity ?? '',
    age: details?.age ?? null,
  };
}

/**
 * Body of the save request built from `draft`, with the display name normalized. Null while a field is missing or
 * invalid.
 */
export function toProfileDetailsUpdate(draft: ProfileDetailsDraft): ProfileDetailsUpdate | null {
  if (!isValidDisplayName(draft.displayName) || !isValidAge(draft.age) || draft.identity === '')
    return null;

  return {
    displayName: normalizeDisplayName(draft.displayName),
    identity: draft.identity,
    age: draft.age,
  };
}
