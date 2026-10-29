import { Pipe, PipeTransform } from '@angular/core';
import type { UserSummary } from '@/core/models/user.model';
import { displayedName } from '@/core/utils/profile';

/**
 * Name shown for a user in a template, `{{ user | displayedName }}`: their display name, or their username when they
 * have none. TypeScript code calls {@link displayedName} directly.
 */
@Pipe({
  name: 'displayedName',
})
export class DisplayedNamePipe implements PipeTransform {
  /**
   * Display name of `user`, or their username when they have none
   */
  transform(user: Pick<UserSummary, 'username' | 'displayName'>): string {
    return displayedName(user);
  }
}
