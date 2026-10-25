import type { Tierlist } from '@/core/models/tierlist.model';

/**
 * Maximum length of a tierlist name, same as the API (CreateTierlistRequest.NameMaxLength)
 */
export const TIERLIST_NAME_MAX_LENGTH = 50;

/**
 * Maximum length of a tierlist description, same as the API (CreateTierlistRequest.DescriptionMaxLength)
 */
export const TIERLIST_DESCRIPTION_MAX_LENGTH = 200;

/**
 * Emojis the user can pick as a tierlist picture (uploading an image is not supported yet)
 */
export const TIERLIST_EMOJIS = [
  '🏆',
  '🥇',
  '⭐',
  '🔥',
  '❤️',
  '💎',
  '🎉',
  '😋',
  '🍕',
  '🍔',
  '🌮',
  '🍣',
  '🍜',
  '🥗',
  '🥩',
  '🍝',
  '🥐',
  '🧀',
  '🍰',
  '🍦',
  '🍩',
  '🍳',
  '🥟',
  '🌶️',
  '🍷',
  '🍺',
  '☕',
  '🍽️',
  '👨‍🍳',
  '📍',
  '🌙',
  '💸',
] as const;

/**
 * Picture of a new tierlist until the user picks another emoji
 */
export const DEFAULT_TIERLIST_EMOJI = TIERLIST_EMOJIS[0];

/**
 * `text` as compared by the tierlist search: lower case, without accents
 */
function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The tierlists whose name contains `query`, ignoring case and accents, in the same order; all of them when the query
 * is blank
 */
export function filterTierlistsByName(tierlists: readonly Tierlist[], query: string): Tierlist[] {
  const searched = searchable(query.trim());
  return tierlists.filter((tierlist) => searchable(tierlist.name).includes(searched));
}

/**
 * Copy of `tierlists`, the most recently updated first (a restaurant added or removed, a pin changed)
 */
export function byLastUpdate(tierlists: readonly Tierlist[]): Tierlist[] {
  return [...tierlists].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * `ids` with `id` removed when it is in it, added at the end otherwise: a tierlist selected or unselected
 */
export function toggleId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];
}

/**
 * True when the restaurant `restaurantId` is one of the restaurants of `tierlist`
 */
export function containsRestaurant(tierlist: Tierlist, restaurantId: string): boolean {
  return tierlist.restaurants.some((entry) => entry.restaurantId === restaurantId);
}
