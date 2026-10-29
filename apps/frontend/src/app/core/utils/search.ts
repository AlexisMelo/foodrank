import type { UserSummary } from '@/core/models/user.model';

/**
 * `text` as compared by the searches of the popups: lower case, without accents
 */
function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The items (tierlists, restaurants) whose name contains `query`, ignoring case and accents, in the same order; all of
 * them when the query is blank
 */
export function filterByName<T extends { readonly name: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const searched = searchable(query.trim());
  return items.filter((item) => searchable(item.name).includes(searched));
}

/**
 * The users whose username or display name contains `query`, ignoring case and accents, in the same order; all of them
 * when the query is blank
 */
export function filterUsers<T extends Pick<UserSummary, 'username' | 'displayName'>>(
  users: readonly T[],
  query: string,
): T[] {
  const searched = searchable(query.trim());
  return users.filter(
    (user) =>
      searchable(user.username).includes(searched) ||
      searchable(user.displayName ?? '').includes(searched),
  );
}
