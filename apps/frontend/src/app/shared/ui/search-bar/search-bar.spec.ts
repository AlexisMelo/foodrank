import { ComponentFixture, TestBed } from '@angular/core/testing';
import { query, submitForm, typeIn } from '@/testing/dom-testing';
import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  let fixture: ComponentFixture<SearchBar>;
  let searches: string[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(SearchBar);
    searches = [];
    fixture.componentInstance.searched.subscribe((q) => searches.push(q));
    await fixture.whenStable();
  });

  /**
   * Text shown in the search field.
   */
  function fieldValue(): string {
    return query<HTMLInputElement>(fixture, '.search-input').value;
  }

  it('searches the text typed, trimmed, on Enter', async () => {
    await typeIn(fixture, '.search-input', '  sushi bar ');

    await submitForm(fixture);

    expect(searches).toEqual(['sushi bar']);
  });

  it('searches on a click on the search button', async () => {
    await typeIn(fixture, '.search-input', 'camille');

    query(fixture, '.search-btn').click();
    await fixture.whenStable();

    expect(searches).toEqual(['camille']);
  });

  it('does not search a blank text', async () => {
    await typeIn(fixture, '.search-input', '   ');

    await submitForm(fixture);

    expect(searches).toEqual([]);
  });

  it('never searches while typing', async () => {
    await typeIn(fixture, '.search-input', 'pizza');

    expect(searches).toEqual([]);
  });

  it('shows the given query, and goes back to it when it changes', async () => {
    fixture.componentRef.setInput('query', 'pizza');
    await fixture.whenStable();
    expect(fieldValue()).toBe('pizza');

    await typeIn(fixture, '.search-input', 'pizza roma');
    fixture.componentRef.setInput('query', 'sushi');
    await fixture.whenStable();

    expect(fieldValue()).toBe('sushi');
  });

  it('focuses the field on demand', async () => {
    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(query(fixture, '.search-input'));
  });
});
