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

  it('shows the food, service and decor scores rounded', async () => {
    const values = (await render(84.6, 70.2, 12.5)).map(textOf);

    expect(values).toEqual(['85', '70', '13']);
  });

  it('colors scores green from 85, yellow from 65, red below', async () => {
    const colors = (await render(85, 65, 64.9)).map((v) => v.style.color);

    expect(colors).toEqual([GREEN, YELLOW, RED]);
  });
});
