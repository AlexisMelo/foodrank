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
