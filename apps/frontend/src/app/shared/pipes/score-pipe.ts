import { Pipe, PipeTransform } from '@angular/core';
import { formatScore } from '@/core/utils/rating';

/**
 * A computed score (an average, 1 to 10) in a template, `{{ average | score }}`: rounded to one decimal, written only
 * when it is not 0, e.g. "7.3", "8", "10". The criteria themselves are whole numbers, shown as they are. TypeScript
 * code calls {@link formatScore} directly.
 */
@Pipe({
  name: 'score',
})
export class ScorePipe implements PipeTransform {
  /**
   * `score` rounded to one decimal, without the decimal of a round score, e.g. "7.3", "8"
   */
  transform(score: number): string {
    return formatScore(score);
  }
}
