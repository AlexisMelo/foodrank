import { Component, computed, input } from '@angular/core';
import { passwordCriteria } from '@/core/utils/signup';

/**
 * The rules a password must follow, each ticked once the password being typed follows it.
 */
@Component({
  selector: 'app-password-criteria',
  styleUrl: './password-criteria.scss',
  templateUrl: './password-criteria.html',
})
export class PasswordCriteria {
  /**
   * Password being typed
   */
  readonly password = input.required<string>();

  /**
   * Each rule, with whether the password follows it
   */
  protected readonly criteria = computed(() => passwordCriteria(this.password()));
}
