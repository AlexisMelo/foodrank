import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { query } from '@/testing/dom-testing';
import { CriterionSlider } from './criterion-slider';

describe('CriterionSlider', () => {
  it('tints the score chip with the color of the score', async () => {
    const field = TestBed.runInInjectionContext(() => form(signal(50)));
    const fixture = TestBed.createComponent(CriterionSlider);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('icon', '🍽️');
    fixture.componentRef.setInput('criterion', 'Food');
    fixture.componentRef.setInput('question', 'Did the food blow your mind?');
    await fixture.whenStable();

    // 50 is rgb(220, 160, 40): text in that color, background and border in the same color, translucent
    const chip = query(fixture, '.rating-chip');
    expect(chip.style.color).toBe('rgb(220, 160, 40)');
    expect(chip.style.backgroundColor).toBe('rgba(220, 160, 40, 0.2)');
    expect(chip.style.borderColor).toBe('rgba(220, 160, 40, 0.4)');
  });
});
