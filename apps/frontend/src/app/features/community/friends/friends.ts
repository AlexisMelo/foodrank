import { Component, computed, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { filterByName } from '@/core/utils/search';
import { PageTopBar } from '@/layout/page-top-bar/page-top-bar';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';
import { injectMyFriends } from '../my-friends';

/**
 * Friends page (/community/friends), opened by "See all" on the community page: every friend of the logged-in user
 * (users who follow each other), from A to Z, filtered by a search on the name. Each row opens the friend's profile.
 */
@Component({
  imports: [FormField, RouterLink, PageTopBar, UserAvatar],
  selector: 'app-friends',
  styleUrl: './friends.scss',
  templateUrl: './friends.html',
})
export class Friends {
  /**
   * Every friend of the logged-in user, from GET /api/users/:id/friends
   */
  protected readonly myFriends = injectMyFriends();

  /**
   * Text typed in the search field, as typed
   */
  protected readonly query = signal('');

  /**
   * Search field, with no validation
   */
  protected readonly searchForm = form(this.query);

  /**
   * Every friend, from A to Z
   */
  private readonly sortedFriends = computed(() =>
    [...this.myFriends.friends()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  /**
   * Friends whose name contains the search, ignoring case and accents, from A to Z; all of them for a blank search
   */
  protected readonly shownFriends = computed(() =>
    filterByName(this.sortedFriends(), this.query()),
  );
}
