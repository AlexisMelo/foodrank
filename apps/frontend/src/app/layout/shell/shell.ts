import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocationStore } from '@/core/location/location-store';
import { NewReviewSheet } from '@/features/review/new-review-sheet/new-review-sheet';
import { ToastOutlet } from '@/shared/ui/toast-outlet/toast-outlet';
import { BottomTabBar } from '../bottom-tab-bar/bottom-tab-bar';

/**
 * Layout of the private pages: the page, the bottom tab bar, the new review sheet and the toasts. Login, sign up and
 * reset password are shown without it.
 */
@Component({
  imports: [RouterOutlet, BottomTabBar, NewReviewSheet, ToastOutlet],
  selector: 'app-shell',
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  constructor() {
    // Locates the user as soon as the app opens (asking for the permission if needed), so the search sheet shows
    // their city at once and a query typed fast is already searched near them
    inject(LocationStore).requestLocation();
  }
}
