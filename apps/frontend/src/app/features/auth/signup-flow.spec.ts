import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@/app.routes';
import { AuthStore } from '@/core/auth/auth-store';
import { clickButton, query, queryAll, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { SignupDraftStore } from './signup-draft-store';

/**
 * Draft of a sign up where nothing is entered
 */
const emptyDraft = { email: '', password: '', username: '', age: null, identity: '' };

describe('Sign up flow', () => {
  let signup: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    signup = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with their access and sign up step guards; a logged-out user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(false), login: vi.fn(), signup },
        },
      ],
    });
  });

  /**
   * Opens `path` in the app.
   */
  async function openApp(path: string): Promise<void> {
    harness = await RouterTestingHarness.create(path);
  }

  /**
   * Current URL of the app, path and query.
   */
  function url(): string {
    return TestBed.inject(Router).url;
  }

  /**
   * True when an element matches `selector`.
   */
  function exists(selector: string): boolean {
    return queryAll(harness.fixture, selector).length > 0;
  }

  /**
   * Clicks the back arrow of the sign up step and waits for the navigation.
   */
  async function goBack(): Promise<void> {
    query(harness.fixture, '.back-link').click();
    await harness.fixture.whenStable();
  }

  it('gives the login and sign up tabs their own URL, the sign up one on step 1', async () => {
    await openApp('/login');
    expect(exists('#login-email')).toBe(true);

    await clickButton(harness.fixture, 'Sign up');
    expect(url()).toBe('/signup?step=1');
    expect(exists('#signup-email')).toBe(true);

    await clickButton(harness.fixture, 'Sign in');
    expect(url()).toBe('/login');
    expect(exists('#login-email')).toBe(true);
  });

  it('opens /signup on step 1', async () => {
    await openApp('/signup');

    expect(url()).toBe('/signup?step=1');
  });

  it('only asks for the email on step 1', async () => {
    await openApp('/signup?step=1');

    expect(queryAll(harness.fixture, 'input').map((i) => i.id)).toEqual(['signup-email']);
    expect(textOf(query(harness.fixture, 'button[type="submit"]'))).toBe('Create account');
  });

  it('goes through the three steps, then signs up with everything entered', async () => {
    signup.mockResolvedValue(undefined);
    await openApp('/signup?step=1');

    // Step 1: email
    await typeIn(harness.fixture, '#signup-email', '  me@test.fr ');
    await submitForm(harness.fixture);
    expect(url()).toBe('/signup?step=2');

    // Step 2: password
    expect(textOf(query(harness.fixture, '.step-label'))).toBe('Step 2');
    expect(query(harness.fixture, '[role="progressbar"]').getAttribute('aria-valuenow')).toBe('2');
    expect(textOf(query(harness.fixture, 'h1'))).toBe('Create a password');
    await typeIn(harness.fixture, '#signup-password', 'abcdefg1');
    await submitForm(harness.fixture);
    expect(url()).toBe('/signup?step=3');

    // Step 3: personal data
    expect(textOf(query(harness.fixture, '.step-label'))).toBe('Step 3');
    expect(textOf(query(harness.fixture, 'h1'))).toBe('Enter your personal data');
    await typeIn(harness.fixture, '#signup-username', 'alex');
    await typeIn(harness.fixture, '#signup-age', '30');
    await typeIn(harness.fixture, '#signup-identity', 'non_binary');
    await submitForm(harness.fixture);

    expect(signup).toHaveBeenCalledWith({
      email: 'me@test.fr',
      password: 'abcdefg1',
      username: 'alex',
      age: 30,
      identity: 'non_binary',
    });
  });

  it('checks the password criteria while typing, and only continues once all are met', async () => {
    await openApp('/signup?step=1');
    await typeIn(harness.fixture, '#signup-email', 'me@test.fr');
    await submitForm(harness.fixture);
    const continueButton = () => query<HTMLButtonElement>(harness.fixture, 'button[type="submit"]');
    const metCriteria = () => queryAll(harness.fixture, '.criterion.met').map(textOf);

    expect(queryAll(harness.fixture, '.criterion').map(textOf)).toEqual([
      '• At least 8 characters',
      '• At least 1 letter',
      '• At least 1 number',
    ]);
    expect(continueButton().disabled).toBe(true);

    await typeIn(harness.fixture, '#signup-password', 'abcdefgh');
    expect(metCriteria()).toEqual(['✓ At least 8 characters', '✓ At least 1 letter']);
    expect(continueButton().disabled).toBe(true);
    await submitForm(harness.fixture);
    expect(url()).toBe('/signup?step=2');

    await typeIn(harness.fixture, '#signup-password', 'abcdefg1');
    expect(metCriteria()).toHaveLength(3);
    expect(continueButton().disabled).toBe(false);
  });

  it('goes back step by step with the arrows, keeping what was entered', async () => {
    await openApp('/signup?step=1');
    await typeIn(harness.fixture, '#signup-email', 'me@test.fr');
    await submitForm(harness.fixture);
    await typeIn(harness.fixture, '#signup-password', 'abcdefg1');
    await submitForm(harness.fixture);

    await goBack();
    expect(url()).toBe('/signup?step=2');
    expect(query<HTMLInputElement>(harness.fixture, '#signup-password').value).toBe('abcdefg1');

    await goBack();
    expect(url()).toBe('/signup?step=1');
    expect(query<HTMLInputElement>(harness.fixture, '#signup-email').value).toBe('me@test.fr');
  });

  it('empties the draft when leaving the sign up for the login tab', async () => {
    await openApp('/signup?step=1');
    await typeIn(harness.fixture, '#signup-email', 'me@test.fr');
    await submitForm(harness.fixture);
    await typeIn(harness.fixture, '#signup-password', 'abcdefg1');
    await goBack();

    await clickButton(harness.fixture, 'Sign in');

    expect(url()).toBe('/login');
    expect(TestBed.inject(SignupDraftStore).draft()).toEqual(emptyDraft);
    await clickButton(harness.fixture, 'Sign up');
    expect(query<HTMLInputElement>(harness.fixture, '#signup-email').value).toBe('');
  });

  it('empties the draft when leaving the sign up by another URL (e.g. the back button)', async () => {
    await openApp('/signup?step=1');
    await typeIn(harness.fixture, '#signup-email', 'me@test.fr');
    await submitForm(harness.fixture);
    await typeIn(harness.fixture, '#signup-password', 'abcdefg1');

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(SignupDraftStore).draft()).toEqual(emptyDraft);
  });

  it('opens the first step missing when a later step is opened directly (e.g. after a reload)', async () => {
    await openApp('/signup?step=3');
    expect(url()).toBe('/signup?step=1');

    TestBed.inject(SignupDraftStore).draft.update((draft) => ({ ...draft, email: 'me@test.fr' }));
    await harness.navigateByUrl('/signup?step=3');
    expect(url()).toBe('/signup?step=2');
  });
});
