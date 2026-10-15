import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@/core/auth/auth-store';
import { query, queryAll, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { SignupDraftStore } from '../../signup-draft-store';
import { SignupProfileStep } from './signup-profile-step';

/**
 * Builds the error HttpClient gives when the API answers with `status` and `error` (its body).
 */
function httpError(status: number, error?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('SignupProfileStep', () => {
  let signup: ReturnType<typeof vi.fn>;
  let draftStore: SignupDraftStore;
  let fixture: ComponentFixture<SignupProfileStep>;

  beforeEach(async () => {
    signup = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: { signup } }],
    });
    draftStore = TestBed.inject(SignupDraftStore);
    // Filled by the previous steps
    draftStore.draft.update((draft) => ({ ...draft, email: 'me@test.fr', password: 'abcdefg1' }));
    fixture = TestBed.createComponent(SignupProfileStep);
    await fixture.whenStable();
  });

  /**
   * Fills the personal data, valid unless overridden.
   */
  async function fill({ username = 'alex', age = '30', identity = 'woman' } = {}): Promise<void> {
    await typeIn(fixture, '#signup-username', username);
    await typeIn(fixture, '#signup-age', age);
    await typeIn(fixture, '#signup-identity', identity);
  }

  function signupButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(fixture, 'button[type="submit"]');
  }

  it('goes back to the password step with the arrow', () => {
    expect(query(fixture, '.back-link').getAttribute('href')).toBe('/signup?step=2');
  });

  it('offers the three identities', () => {
    const options = queryAll<HTMLOptionElement>(fixture, '#signup-identity option:not([disabled])');
    expect(options.map((o) => [o.value, textOf(o)])).toEqual([
      ['man', 'Man'],
      ['woman', 'Woman'],
      ['non_binary', 'Non-binary'],
    ]);
  });

  it('only enables Sign up once pseudonym, age and identity are filled', async () => {
    expect(signupButton().disabled).toBe(true);

    await typeIn(fixture, '#signup-username', 'alex');
    await typeIn(fixture, '#signup-age', '30');
    expect(signupButton().disabled).toBe(true);

    await typeIn(fixture, '#signup-identity', 'man');
    expect(signupButton().disabled).toBe(false);
  });

  it.each([
    [{ age: '-1' }, 'Enter an age between 0 and 120.'],
    [{ age: '121' }, 'Enter an age between 0 and 120.'],
    [{ age: '30.5' }, 'Enter an age between 0 and 120.'],
    [{ username: 'ab' }, 'Between 3 and 30 characters.'],
  ])('refuses %j and explains why', async (values, hint) => {
    await fill(values);
    await submitForm(fixture);

    expect(textOf(query(fixture, '.field-hint'))).toBe(hint);
    expect(signupButton().disabled).toBe(true);
    expect(signup).not.toHaveBeenCalled();
  });

  it('shows no hint while the fields are empty', () => {
    expect(fixture.nativeElement.querySelector('.field-hint')).toBeNull();
  });

  // Not in the Vue specs: the identity options are rendered by @for, after the select gets its value
  it('shows what was entered when coming back to the step', async () => {
    draftStore.draft.update((draft) => ({
      ...draft,
      username: 'alex',
      age: 30,
      identity: 'woman',
    }));
    const again = TestBed.createComponent(SignupProfileStep);
    await again.whenStable();

    expect(query<HTMLInputElement>(again, '#signup-username').value).toBe('alex');
    expect(query<HTMLInputElement>(again, '#signup-age').value).toBe('30');
    expect(query<HTMLSelectElement>(again, '#signup-identity').value).toBe('woman');
  });

  it('signs up with the trimmed pseudonym and the age as a number, then empties the draft', async () => {
    signup.mockResolvedValue(undefined);

    await fill({ username: '  Alex B ', age: '0', identity: 'non_binary' });
    await submitForm(fixture);

    expect(signup).toHaveBeenCalledWith({
      email: 'me@test.fr',
      password: 'abcdefg1',
      username: 'Alex B',
      age: 0,
      identity: 'non_binary',
    });
    expect(draftStore.draft().password).toBe('');
    expect(draftStore.draft().email).toBe('');
  });

  it.each([
    [
      httpError(409, { error: 'This pseudonym is already taken.' }),
      'This pseudonym is already taken.',
    ],
    [
      httpError(409, { error: 'An account with this email already exists.' }),
      'An account with this email already exists.',
    ],
    [httpError(409), 'This email or pseudonym is already used.'],
    [httpError(400, { errors: {} }), 'Some of your information was refused. Please check it.'],
    [httpError(500), 'Could not create account.'],
    [httpError(0, new ProgressEvent('error')), 'Could not create account.'],
  ])('explains a failed sign up (%s) and keeps what was entered', async (error, message) => {
    signup.mockRejectedValue(error);

    await fill();
    await submitForm(fixture);

    expect(textOf(query(fixture, '.error'))).toBe(message);
    expect(signupButton().disabled).toBe(false);
    expect(draftStore.draft().username).toBe('alex');
    expect(draftStore.draft().password).toBe('abcdefg1');
  });
});
