import { formatRatingDate, formatScore, ratingAverage, roundScore, scoreColor } from './rating';

describe('ratingAverage', () => {
  it('averages the three criteria and rounds the result to one decimal', () => {
    expect(ratingAverage({ food: 8, service: 6, setting: 4 })).toBe(6);
    expect(ratingAverage({ food: 8, service: 7, setting: 7 })).toBe(7.3);
    expect(ratingAverage({ food: 9, service: 9, setting: 8 })).toBe(8.7);
  });
});

describe('roundScore', () => {
  it('rounds a computed score to one decimal, halves up', () => {
    expect(roundScore(7.34)).toBe(7.3);
    expect(roundScore(7.35)).toBe(7.4);
    expect(roundScore(8.25)).toBe(8.3);
    expect(roundScore(10)).toBe(10);
  });
});

describe('formatScore', () => {
  it('writes the decimal only when there is one', () => {
    expect(formatScore(7.3)).toBe('7.3');
    expect(formatScore(7)).toBe('7');
    expect(formatScore(10)).toBe('10');
    expect(formatScore(1)).toBe('1');
  });

  it('rounds to one decimal first, leaving out a decimal rounded to 0', () => {
    expect(formatScore(22 / 3)).toBe('7.3');
    expect(formatScore(8.25)).toBe('8.3');
    expect(formatScore(9.96)).toBe('10');
    expect(formatScore(7.04)).toBe('7');
  });
});

describe('scoreColor', () => {
  it('is green from 8.5, yellow from 6.5, red below', () => {
    expect(scoreColor(8.5)).toBe('#90be6d');
    expect(scoreColor(8.4)).toBe('#f9c74f');
    expect(scoreColor(6.5)).toBe('#f9c74f');
    expect(scoreColor(6.4)).toBe('#ff6b6b');
  });

  it('colors whole criteria green from 9, yellow from 7, red below', () => {
    expect([10, 9, 8, 7, 6, 1].map(scoreColor)).toEqual([
      '#90be6d',
      '#90be6d',
      '#f9c74f',
      '#f9c74f',
      '#ff6b6b',
      '#ff6b6b',
    ]);
  });
});

describe('formatRatingDate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('displays the day of the rating', () => {
    vi.stubEnv('TZ', 'Europe/Paris');

    expect(formatRatingDate('2026-03-07T12:00:00+00:00')).toBe('March 7, 2026');
  });

  it('displays the day in the local time zone, ahead of UTC', () => {
    // 23:30 UTC is already 00:30 the next day in Paris
    vi.stubEnv('TZ', 'Europe/Paris');

    expect(formatRatingDate('2026-03-07T23:30:00+00:00')).toBe('March 8, 2026');
  });

  it('displays the day in the local time zone, behind UTC', () => {
    // 02:00 UTC is still 21:00 the day before in New York
    vi.stubEnv('TZ', 'America/New_York');

    expect(formatRatingDate('2026-03-08T02:00:00+00:00')).toBe('March 7, 2026');
  });

  it('displays only the requested parts', () => {
    vi.stubEnv('TZ', 'America/New_York');

    expect(formatRatingDate('2026-03-07T12:00:00+00:00', { month: 'short', day: 'numeric' })).toBe(
      'Mar 7',
    );
  });
});
