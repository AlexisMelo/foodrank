import { HttpErrorResponse } from '@angular/common/http';
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
 * Copy of `tierlists`, the most recently updated first (a restaurant added or removed, a pin changed)
 */
export function byLastUpdate(tierlists: readonly Tierlist[]): Tierlist[] {
  return [...tierlists].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Copy of `tierlists`, the ones holding the most restaurants first; the most recently updated first among the ones
 * holding as many
 */
export function byRestaurantCount(tierlists: readonly Tierlist[]): Tierlist[] {
  // The sort is stable: the tierlists holding as many restaurants keep the order of their last update
  return byLastUpdate(tierlists).sort((a, b) => b.restaurants.length - a.restaurants.length);
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

/**
 * `tierlist` once the restaurant `restaurantId` was added to it, `saved` being the tierlist the API answered: the
 * restaurant's entry added at the end, and the last update of `saved` when it is later. The API answers each addition
 * with the restaurants it read before adding, so the answers of additions sent together each miss the others: merging
 * each answer into the tierlist shown keeps them all.
 */
export function withAddedRestaurant(
  tierlist: Tierlist,
  saved: Tierlist,
  restaurantId: string,
): Tierlist {
  if (containsRestaurant(tierlist, restaurantId)) return tierlist;
  const entry = saved.restaurants.find((e) => e.restaurantId === restaurantId) ?? {
    restaurantId,
    addedAt: null,
  };
  return {
    ...tierlist,
    restaurants: [...tierlist.restaurants, entry],
    updatedAt: laterUpdate(tierlist, saved),
  };
}

/**
 * `tierlist` once the restaurant `restaurantId` was removed from it, `saved` being the tierlist the API answered: the
 * restaurant's entry removed, and the last update of `saved` when it is later. As for `withAddedRestaurant`, the answer
 * misses the changes sent with it, so it is merged into the tierlist shown rather than shown in its place.
 */
export function withRemovedRestaurant(
  tierlist: Tierlist,
  saved: Tierlist,
  restaurantId: string,
): Tierlist {
  return {
    ...tierlist,
    restaurants: tierlist.restaurants.filter((entry) => entry.restaurantId !== restaurantId),
    updatedAt: laterUpdate(tierlist, saved),
  };
}

/**
 * The later of the last updates of `tierlist` and `saved`
 */
function laterUpdate(tierlist: Tierlist, saved: Tierlist): string {
  const savedIsLater = new Date(saved.updatedAt).getTime() > new Date(tierlist.updatedAt).getTime();
  return savedIsLater ? saved.updatedAt : tierlist.updatedAt;
}

/**
 * True when the API refused to add a restaurant to a tierlist because it is already in it (409)
 */
export function isAlreadyInTierlist(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * Toast telling the restaurant `restaurantName` is already in the tierlist `tierlistName`
 */
export function alreadyInTierlistMessage(restaurantName: string, tierlistName: string): string {
  return `${restaurantName} is already in ${tierlistName}.`;
}

/**
 * Toast telling why the restaurant `restaurantName` could not be added to the tierlist `tierlistName`: already in it
 * (409), or any other `error` of the API
 */
export function addToTierlistErrorMessage(
  error: unknown,
  restaurantName: string,
  tierlistName: string,
): string {
  return isAlreadyInTierlist(error)
    ? alreadyInTierlistMessage(restaurantName, tierlistName)
    : `Couldn't add ${restaurantName} to ${tierlistName}, try again.`;
}
