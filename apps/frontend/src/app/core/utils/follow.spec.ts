import { followButtonLabel, followersCountLabel } from './follow';

describe('followButtonLabel', () => {
  it('offers to follow a user who does not follow me', () => {
    expect(followButtonLabel(false, false)).toBe('Follow');
  });

  it('offers to follow back a user who already follows me', () => {
    expect(followButtonLabel(false, true)).toBe('Follow back');
  });

  it('says "Following" once I follow the user, whether they follow me or not', () => {
    expect(followButtonLabel(true, false)).toBe('Following');
    expect(followButtonLabel(true, true)).toBe('Following');
  });
});

describe('followersCountLabel', () => {
  it('uses the singular for one follower only', () => {
    expect(followersCountLabel(0)).toBe('0 followers');
    expect(followersCountLabel(1)).toBe('1 follower');
    expect(followersCountLabel(12)).toBe('12 followers');
  });
});
