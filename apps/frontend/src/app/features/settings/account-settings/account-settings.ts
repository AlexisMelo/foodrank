import { Component, signal } from '@angular/core';
import { PageTopBar } from '@/layout/page-top-bar/page-top-bar';
import { DeleteAccountModal } from '../delete-account-modal/delete-account-modal';

/**
 * Account settings page (/settings/account), opened from the settings page: account deletion.
 */
@Component({
  imports: [DeleteAccountModal, PageTopBar],
  selector: 'app-account-settings',
  styleUrl: './account-settings.scss',
  templateUrl: './account-settings.html',
})
export class AccountSettings {
  /**
   * True while the delete account popup is shown
   */
  protected readonly deleteAccountOpen = signal(false);
}
