import { ComponentFixture, TestBed } from '@angular/core/testing';
import { queryAll, textOf } from '@/testing/dom-testing';
import { SortChips } from './sort-chips';

describe('SortChips', () => {
  let fixture: ComponentFixture<SortChips<'score' | 'az'>>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SortChips<'score' | 'az'>);
    fixture.componentRef.setInput('options', [
      { key: 'score', label: 'Score' },
      { key: 'az', label: 'A–Z' },
    ]);
    fixture.componentRef.setInput('value', 'score');
    await fixture.whenStable();
  });

  /**
   * The chips, in display order.
   */
  function chips(): HTMLButtonElement[] {
    return queryAll<HTMLButtonElement>(fixture, '.sort-chip');
  }

  it('shows a chip per order, in order, the chosen one pressed, in a labelled group', () => {
    expect(chips().map(textOf)).toEqual(['Score', 'A–Z']);
    expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(fixture.nativeElement.getAttribute('role')).toBe('group');
    expect(fixture.nativeElement.getAttribute('aria-label')).toBe('Sort by');
  });

  it('chooses the order of the chip picked', async () => {
    chips()[1]!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('az');
    expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });
});
