import { displayedName, restaurantCountLabel } from './profile';

describe('restaurantCountLabel', () => {
  it('puts restaurant in the singular for one only', () => {
    expect(restaurantCountLabel(0)).toBe('0 restaurants');
    expect(restaurantCountLabel(1)).toBe('1 restaurant');
    expect(restaurantCountLabel(3)).toBe('3 restaurants');
  });
});

describe('displayedName', () => {
  it('shows the display name when the user chose one', () => {
    expect(displayedName({ username: 'cam_92', displayName: 'Camille D.' })).toBe('Camille D.');
  });

  it('shows the username when there is no display name', () => {
    expect(displayedName({ username: 'cam_92', displayName: null })).toBe('cam_92');
  });
});
