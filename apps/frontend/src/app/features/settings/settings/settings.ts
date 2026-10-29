import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';
import { injectUserProfile } from '@/shared/data/user-profile';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Settings page (/settings): the logged-in user's avatar and names, the link to the account settings, and log out.
 */
@Component({
  imports: [RouterLink, UserAvatar, DisplayedNamePipe],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {
  /**
   * Logs out
   */
  protected readonly auth = inject(AuthStore);

  /**
   * Profile of the logged-in user, shown at the top, with a placeholder while it loads and an error message when it
   * cannot be loaded
   */
  protected readonly user = injectUserProfile();
}
