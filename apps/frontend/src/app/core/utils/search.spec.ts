import { filterByName, filterUsers } from './search';

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

describe('filterUsers', () => {
  /**
   * Users searched: with a display name holding accents, with a display name unlike the username, and without one
   */
  const users = [
    { id: 1, username: 'elodie.b', displayName: 'Élodie Bernard' },
    { id: 2, username: 'cam_92', displayName: 'Camille' },
    { id: 3, username: 'hugo', displayName: null },
  ];

  it('keeps the users whose username contains the query, in the same order', () => {
    expect(filterUsers(users, 'CAM_').map((u) => u.id)).toEqual([2]);
    expect(filterUsers(users, 'o').map((u) => u.id)).toEqual([1, 3]);
  });

  it('keeps the users whose display name contains the query, whatever its case and accents', () => {
    expect(filterUsers(users, 'camille').map((u) => u.id)).toEqual([2]);
    expect(filterUsers(users, 'bernard').map((u) => u.id)).toEqual([1]);
    expect(filterUsers(users, 'ÉLODIE B').map((u) => u.id)).toEqual([1]);
  });

  it('keeps every user for a blank query, and nothing when no name matches', () => {
    expect(filterUsers(users, '  ').map((u) => u.id)).toEqual([1, 2, 3]);
    expect(filterUsers(users, 'lea')).toEqual([]);
  });
});
