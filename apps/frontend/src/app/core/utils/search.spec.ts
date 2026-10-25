import { filterByName } from './search';

describe('filterByName', () => {
  /**
   * Items searched, one with accents in its name
   */
  const items = [
    { id: 1, name: 'Crêpes du dimanche' },
    { id: 2, name: 'Top 10' },
    { id: 3, name: 'Date night' },
  ];

  it('keeps the items whose name contains the query, whatever its case and accents, in the same order', () => {
    expect(filterByName(items, 'CREPE').map((i) => i.id)).toEqual([1]);
    expect(filterByName(items, 'dimanche').map((i) => i.id)).toEqual([1]);
    expect(filterByName(items, 'T').map((i) => i.id)).toEqual([2, 3]);
  });

  it('keeps every item for a blank query, ignoring the spaces around a query', () => {
    expect(filterByName(items, '   ').map((i) => i.id)).toEqual([1, 2, 3]);
    expect(filterByName(items, '  top ').map((i) => i.id)).toEqual([2]);
  });

  it('keeps nothing when no name matches', () => {
    expect(filterByName(items, 'sushi')).toEqual([]);
  });
});
