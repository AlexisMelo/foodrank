import {
  displayedName,
  isValidDisplayName,
  normalizeDisplayName,
  restaurantCountLabel,
  toProfileDetailsDraft,
  toProfileDetailsUpdate,
} from './profile';

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

describe('normalizeDisplayName', () => {
  it('trims the display name, and gives null for a blank one', () => {
    expect(normalizeDisplayName('  Alexis Melo ')).toBe('Alexis Melo');
    expect(normalizeDisplayName('   ')).toBeNull();
    expect(normalizeDisplayName('')).toBeNull();
  });
});

describe('isValidDisplayName', () => {
  it('accepts free text of up to 30 characters once trimmed, and a blank name', () => {
    const chef = `Chef ${String.fromCodePoint(0x1f469, 0x200d, 0x1f373)}`;
    for (const name of [
      'Alexis Melo',
      "Zoë O'Brien-Durand",
      'Алексей',
      chef,
      '<b>Alexis</b>',
      'a'.repeat(30),
      `  ${'a'.repeat(30)}  `,
      '',
      '   ',
    ]) {
      expect(isValidDisplayName(name), name).toBe(true);
    }
  });

  it('refuses more than 30 characters, line breaks and invisible characters', () => {
    for (const name of [
      'a'.repeat(31),
      'Alexis\nMelo',
      'Alexis\tMelo',
      `Alexis${String.fromCodePoint(0x202e)}oleM`,
      `Ale${String.fromCodePoint(0x200b)}xis`,
      `Alexis${String.fromCodePoint(0x2028)}Melo`,
    ]) {
      expect(isValidDisplayName(name), JSON.stringify(name)).toBe(false);
    }
  });
});

describe('toProfileDetailsDraft', () => {
  it('fills the fields with the details, empty for an older account', () => {
    expect(
      toProfileDetailsDraft({
        username: 'alexis.melo',
        displayName: 'Alexis',
        avatarUrl: null,
        identity: 'man',
        age: 30,
      }),
    ).toEqual({ displayName: 'Alexis', identity: 'man', age: 30 });
    expect(
      toProfileDetailsDraft({
        username: 'camille',
        displayName: null,
        avatarUrl: null,
        identity: null,
        age: null,
      }),
    ).toEqual({ displayName: '', identity: '', age: null });
  });

  it('gives empty fields while the details are not loaded', () => {
    expect(toProfileDetailsDraft(undefined)).toEqual({ displayName: '', identity: '', age: null });
  });
});

describe('toProfileDetailsUpdate', () => {
  it('sends the trimmed display name, or null for a blank one', () => {
    expect(toProfileDetailsUpdate({ displayName: ' Alexis ', identity: 'woman', age: 0 })).toEqual({
      displayName: 'Alexis',
      identity: 'woman',
      age: 0,
    });
    expect(toProfileDetailsUpdate({ displayName: '  ', identity: 'man', age: 30 })).toEqual({
      displayName: null,
      identity: 'man',
      age: 30,
    });
  });

  it('gives null while a field is missing or invalid', () => {
    expect(
      toProfileDetailsUpdate({ displayName: 'a'.repeat(31), identity: 'man', age: 30 }),
    ).toBeNull();
    expect(toProfileDetailsUpdate({ displayName: 'Alexis', identity: '', age: 30 })).toBeNull();
    expect(
      toProfileDetailsUpdate({ displayName: 'Alexis', identity: 'man', age: null }),
    ).toBeNull();
    expect(toProfileDetailsUpdate({ displayName: 'Alexis', identity: 'man', age: 121 })).toBeNull();
    expect(toProfileDetailsUpdate({ displayName: 'Alexis', identity: 'man', age: 2.5 })).toBeNull();
  });
});
