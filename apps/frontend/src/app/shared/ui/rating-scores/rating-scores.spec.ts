import { TestBed } from '@angular/core/testing';
import { queryAll, textOf } from '@/testing/dom-testing';
import { RatingScores } from './rating-scores';

const GREEN = 'rgb(144, 190, 109)';
const YELLOW = 'rgb(249, 199, 79)';
const RED = 'rgb(255, 107, 107)';

describe('RatingScores', () => {
  /**
   * Renders the scores `food`, `service` and `decor`, and returns their value elements.
   */
  async function render(food: number, service: number, decor: number): Promise<HTMLElement[]> {
    const fixture = TestBed.createComponent(RatingScores);
    fixture.componentRef.setInput('food', food);
    fixture.componentRef.setInput('service', service);
    fixture.componentRef.setInput('decor', decor);
    await fixture.whenStable();
    return queryAll(fixture, '.score-value');
  }

  it('shows the food, service and decor scores as whole numbers', async () => {
    expect((await render(9, 7, 1)).map(textOf)).toEqual(['9', '7', '1']);
    expect((await render(8.6, 7.2, 1.5)).map(textOf)).toEqual(['9', '7', '2']);
  });

  it('colors scores green from 9, yellow from 7, red below', async () => {
    const colors = (await render(9, 7, 6)).map((v) => v.style.color);

    expect(colors).toEqual([GREEN, YELLOW, RED]);
  });
});
