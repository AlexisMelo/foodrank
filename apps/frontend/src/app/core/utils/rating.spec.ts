import { formatRatingDate, ratingAverage, scoreColor } from './rating';

describe('ratingAverage', () => {
  it('averages the three criteria and rounds the result', () => {
    expect(ratingAverage({ food: 80, service: 61, setting: 40 })).toBe(60);
    expect(ratingAverage({ food: 90.5, service: 90, setting: 91 })).toBe(91);
  });
});

describe('scoreColor', () => {
  it('is green from 85, yellow from 65, red below', () => {
    expect(scoreColor(85)).toBe('#90be6d');
    expect(scoreColor(84)).toBe('#f9c74f');
    expect(scoreColor(65)).toBe('#f9c74f');
    expect(scoreColor(64)).toBe('#ff6b6b');
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
