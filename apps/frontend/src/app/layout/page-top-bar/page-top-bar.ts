import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Bar at the top of a page: back arrow, title, and an optional action projected on the right. */
@Component({
  imports: [RouterLink],
  selector: 'app-page-top-bar',
  styleUrl: './page-top-bar.scss',
  templateUrl: './page-top-bar.html',
})
export class PageTopBar {
  /** Page title, next to the back arrow */
  readonly title = input.required<string>();
  /** Route opened by the back arrow */
  readonly backTo = input.required<string>();
}
