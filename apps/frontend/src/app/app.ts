import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component: shows the page of the current route.
 */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
