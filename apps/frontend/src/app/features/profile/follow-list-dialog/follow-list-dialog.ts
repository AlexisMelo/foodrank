import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UserSummary } from '@/core/models/user.model';
import { filterUsers } from '@/core/utils/search';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { SearchDialog } from '@/shared/ui/search-dialog/search-dialog';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * List of a profile opened in the popup: the users following the user shown, or the users they follow
 */
export type FollowList = 'followers' | 'following';

/**
 * Popup of a profile listing its followers, or the users it follows, covering the whole screen, filtered by a search
 * on the username or display name. Each row (avatar, display name and username) opens the user's profile; the parent
 * removes the popup when the profile shown changes.
 */
@Component({
  imports: [RouterLink, SearchDialog, UserAvatar, DisplayedNamePipe],
  selector: 'app-follow-list-dialog',
  styleUrl: './follow-list-dialog.scss',
  templateUrl: './follow-list-dialog.html',
})
export class FollowListDialog {
  /**
   * Which list the users are, giving the title and the messages
   */
  readonly list = input.required<FollowList>();

  /**
   * Users listed, the most recent follow first as the API sends them
   */
  readonly users = input.required<readonly UserSummary[]>();

  /**
   * The popup asks to be closed (× button, Esc or a click outside)
   */
  readonly closed = output<void>();

  /**
   * Text typed in the search field, as typed
   */
  protected readonly query = signal('');

  /**
   * Title of the popup
   */
  protected readonly heading = computed(() =>
    this.list() === 'followers' ? 'Followers' : 'Following',
  );

  /**
   * Placeholder and accessible name of the search field
   */
  protected readonly searchLabel = computed(() =>
    this.list() === 'followers' ? 'Search followers' : 'Search following',
  );

  /**
   * Shown instead of the list when it is empty, before any search
   */
  protected readonly emptyMessage = computed(() =>
    this.list() === 'followers' ? 'No followers yet' : 'Not following anyone yet',
  );

  /**
   * Users whose username or display name contains the search, in the order of the list
   */
  protected readonly shownUsers = computed(() => filterUsers(this.users(), this.query()));
}
