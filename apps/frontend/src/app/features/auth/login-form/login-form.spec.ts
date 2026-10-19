import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthStore } from '@/core/auth/auth-store';
import { clickButton, query, submitForm, typeIn } from '@/testing/dom-testing';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let login: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<LoginForm>;

  beforeEach(async () => {
    login = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: AuthStore, useValue: { login } }] });
    fixture = TestBed.createComponent(LoginForm);
    await fixture.whenStable();
  });

  /**
   * Fills the form with `email` and `password`, then submits it.
   */
  async function submit(email: string, password: string): Promise<void> {
    await typeIn(fixture, '#login-email', email);
    await typeIn(fixture, '#login-password', password);
    await submitForm(fixture);
  }

  it('logs in with the trimmed email', async () => {
    login.mockResolvedValue(undefined);

    await submit('  me@test.fr ', 'secret');

    expect(login).toHaveBeenCalledWith('me@test.fr', 'secret');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('shows an error when the login fails', async () => {
    login.mockRejectedValue(new Error('400'));

    await submit('me@test.fr', 'wrong');

    expect(query(fixture, '.error').textContent).toBe('Invalid email or password.');
    expect(query<HTMLButtonElement>(fixture, 'button[type="submit"]').disabled).toBe(false);
  });

  it('asks to switch to the sign up form', async () => {
    const goToSignup = vi.fn();
    fixture.componentInstance.goToSignup.subscribe(goToSignup);

    await clickButton(fixture, 'Sign up');

    expect(goToSignup).toHaveBeenCalledTimes(1);
  });

  it('asks to switch to the forgot password form', async () => {
    const goToForgot = vi.fn();
    fixture.componentInstance.goToForgot.subscribe(goToForgot);

    query(fixture, '.btn-link').click();
    await fixture.whenStable();

    expect(goToForgot).toHaveBeenCalledTimes(1);
  });
});
