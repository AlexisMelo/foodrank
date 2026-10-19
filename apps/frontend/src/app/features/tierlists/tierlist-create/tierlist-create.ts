import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, form, maxLength, required, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { TierlistApi } from '@/core/api/tierlist-api';
import {
  DEFAULT_TIERLIST_EMOJI,
  TIERLIST_DESCRIPTION_MAX_LENGTH,
  TIERLIST_EMOJIS,
  TIERLIST_NAME_MAX_LENGTH,
} from '@/core/utils/tierlist';
import { PageTopBar } from '@/layout/page-top-bar/page-top-bar';
import { ToggleSwitch } from '@/shared/ui/toggle-switch/toggle-switch';
import { EmojiCoverPicker } from '../emoji-cover-picker/emoji-cover-picker';

/**
 * Message shown when creating the tierlist failed, depending on the API answer
 */
function saveErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return 'Log in to create a tierlist.';
  }
  return 'Could not create your tierlist, try again.';
}

/**
 * Tierlist creation page (/tierlists/new): cover emoji, name, optional description and pin to the profile. Goes
 * back to the tierlists page once the tierlist is created.
 */
@Component({
  imports: [EmojiCoverPicker, FormField, PageTopBar, ToggleSwitch],
  selector: 'app-tierlist-create',
  styleUrl: './tierlist-create.scss',
  templateUrl: './tierlist-create.html',
})
export class TierlistCreate {
  /**
   * Goes back to the tierlists page once the tierlist is created
   */
  private readonly router = inject(Router);

  /**
   * Creates the tierlist
   */
  private readonly tierlistApi = inject(TierlistApi);

  /**
   * Values as entered: description and name untrimmed, the default emoji until the user picks another one
   */
  private readonly tierlist = signal({
    emoji: DEFAULT_TIERLIST_EMOJI as string,
    name: '',
    description: '',
    pinned: false,
  });

  /**
   * Fields of the tierlist. The description is optional and the emoji has a default value: only the name must be
   * filled, with more than blanks. The max lengths are also set on the fields, so the browser stops the typing there
   */
  protected readonly tierlistForm = form(this.tierlist, (tierlist) => {
    required(tierlist.emoji);
    required(tierlist.name);
    validate(tierlist.name, ({ value }) => (value().trim() === '' ? { kind: 'blank' } : null));
    maxLength(tierlist.name, TIERLIST_NAME_MAX_LENGTH);
    maxLength(tierlist.description, TIERLIST_DESCRIPTION_MAX_LENGTH);
  });

  /**
   * True while the tierlist is being created: Create is disabled, so it is not created twice
   */
  protected readonly saving = signal(false);

  /**
   * Message of the last failed creation; null when there is none
   */
  protected readonly saveError = signal<string | null>(null);

  /**
   * Emojis the user can pick as the cover
   */
  protected readonly emojis = TIERLIST_EMOJIS;

  /**
   * Maximum length of the description, shown in its counter
   */
  protected readonly descriptionMaxLength = TIERLIST_DESCRIPTION_MAX_LENGTH;

  /**
   * Create the tierlist, then go back to the tierlists page
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.tierlistForm().valid() || this.saving()) return;
    const { emoji, name, description, pinned } = this.tierlist();
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(
        this.tierlistApi.createTierlist({
          emoji,
          name: name.trim(),
          description: description.trim() || null,
          pinned,
        }),
      );
      // Replace: going back from the tierlists page must not reopen the submitted form
      void this.router.navigateByUrl('/tierlists', { replaceUrl: true });
    } catch (error) {
      this.saveError.set(saveErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
