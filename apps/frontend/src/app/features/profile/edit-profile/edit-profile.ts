import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormField,
  disabled,
  form,
  max,
  maxLength,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import { ToastStore } from '@/core/toast/toast-store';
import {
  DISPLAY_NAME_MAX_LENGTH,
  isValidDisplayName,
  toProfileDetailsDraft,
  toProfileDetailsUpdate,
} from '@/core/utils/profile';
import { IDENTITIES, MAX_AGE, isValidAge } from '@/core/utils/signup';
import { PageTopBar } from '@/layout/page-top-bar/page-top-bar';
import { DisplayedNamePipe } from '@/shared/pipes/displayed-name-pipe';
import { UserAvatar } from '@/shared/ui/user-avatar/user-avatar';

/**
 * Edit profile page (/profile/edit), opened from the logged-in user's profile and from the account settings: their
 * avatar (not editable yet), then their display name, identity and age. Goes to their profile once saved.
 */
@Component({
  imports: [DisplayedNamePipe, FormField, PageTopBar, UserAvatar],
  selector: 'app-edit-profile',
  styleUrl: './edit-profile.scss',
  templateUrl: './edit-profile.html',
})
export class EditProfile {
  /**
   * Reads and saves the details of the logged-in user
   */
  private readonly userApi = inject(UserApi);

  /**
   * Opens the profile once the details are saved
   */
  private readonly router = inject(Router);

  /**
   * Confirms the details are saved
   */
  private readonly toasts = inject(ToastStore);

  /**
   * Details of the logged-in user, from GET /api/users/me/details
   */
  protected readonly details = rxResource({
    stream: () => this.userApi.fetchProfileDetails(),
  });

  /**
   * Fields as entered, filled with the details once they are loaded
   */
  private readonly draft = linkedSignal(() =>
    toProfileDetailsDraft(this.details.hasValue() ? this.details.value() : undefined),
  );

  /**
   * True while the save request runs: the fields and Save are disabled
   */
  protected readonly saving = signal(false);

  /**
   * Message of the last failed save; null when there is none
   */
  protected readonly saveError = signal<string | null>(null);

  /**
   * Identities offered in the select
   */
  protected readonly identities = IDENTITIES;

  /**
   * Fields of the page, with the same rules as toProfileDetailsUpdate (and the API). The display name is optional:
   * blank, the username is shown
   */
  protected readonly profileForm = form(this.draft, (draft) => {
    // maxLength, min and max also set the attributes of the native fields
    maxLength(draft.displayName, DISPLAY_NAME_MAX_LENGTH);
    validate(draft.displayName, ({ value }) =>
      isValidDisplayName(value()) ? undefined : { kind: 'displayName' },
    );

    required(draft.identity);

    required(draft.age);
    min(draft.age, 0);
    max(draft.age, MAX_AGE);
    validate(draft.age, ({ value }) => (isValidAge(value()) ? undefined : { kind: 'age' }));

    disabled(draft.displayName, { when: () => this.saving() });
    disabled(draft.identity, { when: () => this.saving() });
    disabled(draft.age, { when: () => this.saving() });
  });

  /**
   * Explains an invalid display name (a pasted line break or invisible character), empty while it is valid
   */
  protected readonly displayNameHint = computed(() =>
    this.profileForm.displayName().invalid()
      ? `Up to ${DISPLAY_NAME_MAX_LENGTH} characters, without line breaks nor invisible characters.`
      : '',
  );

  /**
   * Explains an invalid age, empty while it is valid or empty
   */
  protected readonly ageHint = computed(() => {
    const age = this.profileForm.age();
    return age.value() !== null && age.invalid() ? `Enter an age between 0 and ${MAX_AGE}.` : '';
  });

  /**
   * True until the details are loaded, and while a field is missing or invalid: Save stays disabled
   */
  protected readonly incomplete = computed(
    () => !this.details.hasValue() || toProfileDetailsUpdate(this.draft()) === null,
  );

  /**
   * Saves the details, then opens the profile; explains the failure otherwise.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const update = toProfileDetailsUpdate(this.draft());
    if (!update || this.saving()) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(this.userApi.updateProfileDetails(update));
      this.toasts.show('Profile saved', 'success');
      // Replace: going back from the profile must not reopen the submitted form
      void this.router.navigateByUrl('/profile', { replaceUrl: true });
    } catch (error) {
      // A 401 never shows here: the unauthorized interceptor already logs out and leaves the page
      this.saveError.set(
        error instanceof HttpErrorResponse && error.status === 400
          ? 'Some of your information was refused. Please check it.'
          : 'Could not save your profile, try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
