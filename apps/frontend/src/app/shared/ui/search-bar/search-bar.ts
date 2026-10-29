import { Component, ElementRef, input, linkedSignal, output, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

/**
 * Search field of the app with its button, in the search sheet and at the top of the search results page. Searches
 * restaurants and users on Enter or a click on the button only, never while typing.
 */
@Component({
  imports: [FormField],
  selector: 'app-search-bar',
  styleUrl: './search-bar.scss',
  templateUrl: './search-bar.html',
})
export class SearchBar {
  /**
   * Text shown in the field, e.g. the query of the results page; '' by default. The field goes back to it each time
   * it changes (e.g. back to a previous search)
   */
  readonly query = input('');

  /**
   * Emits the text of the field, trimmed, on Enter or a click on the button; not emitted when the text is blank
   */
  readonly searched = output<string>();

  /**
   * The text field, focused by focus()
   */
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /**
   * Text of the field as typed, reset to query each time it changes
   */
  private readonly text = linkedSignal(() => ({ query: this.query() }));

  /**
   * Search field, with no validation
   */
  protected readonly searchForm = form(this.text);

  /**
   * Focuses the text field, e.g. when the search sheet opens
   */
  focus(): void {
    this.field().nativeElement.focus();
  }

  /**
   * Emits the trimmed text, unless it is blank; the browser does not submit the form
   */
  protected submit(event: Event): void {
    event.preventDefault();
    const query = this.text().query.trim();
    if (query) this.searched.emit(query);
  }
}
