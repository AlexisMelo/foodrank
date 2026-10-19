import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NewReviewSheet } from '@/features/review/new-review-sheet/new-review-sheet';
import { BottomTabBar } from '../bottom-tab-bar/bottom-tab-bar';

/**
 * Layout of the private pages: the page, the bottom tab bar and the new review sheet. Login, sign up and reset
 * password are shown without it.
 */
@Component({
  imports: [RouterOutlet, BottomTabBar, NewReviewSheet],
  selector: 'app-shell',
  templateUrl: './shell.html',
})
export class Shell {}
