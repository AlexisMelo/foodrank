import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page shown for an unknown URL (the `**` route), with a link to the home page.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-not-found',
  styleUrl: './not-found.scss',
  templateUrl: './not-found.html',
})
export class NotFound {}
