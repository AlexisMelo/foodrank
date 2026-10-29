import type { UserSummary } from '@/core/models/user.model';

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
