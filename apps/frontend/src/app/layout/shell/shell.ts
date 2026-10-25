import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
export class Shell {}
