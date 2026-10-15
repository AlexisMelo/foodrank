import { Component } from '@angular/core';
import { ResetPasswordForm } from '../reset-password-form/reset-password-form';

/** Reset password page (/auth/reset-password), opened from the link of the reset email. Open to everyone. */
@Component({
  imports: [ResetPasswordForm],
  selector: 'app-reset-password',
  styleUrl: './reset-password.scss',
  templateUrl: './reset-password.html',
})
export class ResetPassword {}
