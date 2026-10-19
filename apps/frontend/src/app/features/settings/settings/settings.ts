import { Component, inject, signal } from '@angular/core';
import { AuthStore } from '@/core/auth/auth-store';
import { injectUserProfile } from '@/shared/data/user-profile';
import { UserBar } from '@/shared/ui/user-bar/user-bar';
import { DeleteAccountModal } from '../delete-account-modal/delete-account-modal';

/**
 * Settings page (/settings): the logged-in user, log out and account deletion.
 */
@Component({
  imports: [DeleteAccountModal, UserBar],
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
   * Profile of the logged-in user, shown in the user bar
   */
  protected readonly profile = injectUserProfile().profile;

  /**
   * True while the delete account popup is shown
   */
  protected readonly deleteAccountOpen = signal(false);
}
