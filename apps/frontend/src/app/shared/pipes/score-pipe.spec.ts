import { ScorePipe } from './score-pipe';

describe('ScorePipe', () => {
  const pipe = new ScorePipe();

  it('shows a computed score with one decimal', () => {
    expect(pipe.transform(22 / 3)).toBe('7.3');
  });

  it('leaves out the decimal of a round score', () => {
    expect(pipe.transform(8)).toBe('8');
    expect(pipe.transform(10)).toBe('10');
    expect(pipe.transform(1)).toBe('1');
  });
});
