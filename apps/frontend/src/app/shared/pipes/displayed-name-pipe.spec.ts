import { DisplayedNamePipe } from './displayed-name-pipe';

describe('DisplayedNamePipe', () => {
  const pipe = new DisplayedNamePipe();

  it('gives the display name of a user who has one', () => {
    expect(pipe.transform({ username: 'alexis.melo', displayName: 'Alexis Melo' })).toBe(
      'Alexis Melo',
    );
  });

  it('gives the username of a user without a display name', () => {
    expect(pipe.transform({ username: 'camille', displayName: null })).toBe('camille');
  });
});
