import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageTopBar } from '@/layout/page-top-bar/page-top-bar';
import { DeleteAccountModal } from '../delete-account-modal/delete-account-modal';

/**
 * Account settings page (/settings/account), opened from the settings page: the link to the edit profile page, and
 * account deletion.
 */
@Component({
  imports: [DeleteAccountModal, PageTopBar, RouterLink],
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
