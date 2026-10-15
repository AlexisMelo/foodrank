import type { SignupDraft } from '@/core/models/user.model';
import {
  isValidAge,
  isValidPassword,
  isValidUsername,
  passwordCriteria,
  reachableSignupStep,
  signupStepRoute,
  toSignupData,
} from './signup';

/** A draft filled up to the personal data step, with `changes`. */
function draft(changes: Partial<SignupDraft> = {}): SignupDraft {
  return {
    email: 'me@test.fr',
    password: 'abcdefg1',
    username: 'alex',
    age: 30,
    identity: 'woman',
    ...changes,
  };
}

describe('passwordCriteria', () => {
  it('lists the three rules, none met for an empty password', () => {
    expect(passwordCriteria('')).toEqual([
      { label: 'At least 8 characters', met: false },
      { label: 'At least 1 letter', met: false },
      { label: 'At least 1 number', met: false },
    ]);
  });

  it('checks each rule on its own', () => {
    expect(passwordCriteria('abcdefgh').map((c) => c.met)).toEqual([true, true, false]);
    expect(passwordCriteria('12345678').map((c) => c.met)).toEqual([true, false, true]);
    expect(passwordCriteria('a1').map((c) => c.met)).toEqual([false, true, true]);
  });

  it('counts accented letters as letters', () => {
    expect(passwordCriteria('1234567é').every((c) => c.met)).toBe(true);
  });
});

describe('isValidPassword', () => {
  it.each(['abcdefg1', '1234567a', 'Pass word 2026 !'])('accepts %j', (password) => {
    expect(isValidPassword(password)).toBe(true);
  });

  it.each(['', 'abcdef1', 'abcdefgh', '12345678', '!!!!!!!!'])('refuses %j', (password) => {
    expect(isValidPassword(password)).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('needs 3 to 30 characters once trimmed', () => {
    expect(isValidUsername('abc')).toBe(true);
    expect(isValidUsername('a'.repeat(30))).toBe(true);
    expect(isValidUsername('  ab  ')).toBe(false);
    expect(isValidUsername('   ')).toBe(false);
    expect(isValidUsername('a'.repeat(31))).toBe(false);
  });
});

describe('isValidAge', () => {
  it('accepts whole numbers from 0 to 120', () => {
    expect(isValidAge(0)).toBe(true);
    expect(isValidAge(30)).toBe(true);
    expect(isValidAge(120)).toBe(true);
  });

  it.each([-1, 121, 30.5, Number.NaN, null] as const)('refuses %j', (age) => {
    expect(isValidAge(age)).toBe(false);
  });
});

describe('toSignupData', () => {
  it('builds the request body with the trimmed pseudonym', () => {
    expect(toSignupData(draft({ username: '  alex  ' }))).toEqual({
      email: 'me@test.fr',
      password: 'abcdefg1',
      username: 'alex',
      age: 30,
      identity: 'woman',
    });
  });

  it.each<Partial<SignupDraft>>([
    { username: '' },
    { username: 'ab' },
    { age: null },
    { age: -1 },
    { age: 121 },
    { identity: '' },
  ])('is null while the personal data is missing or invalid: %j', (changes) => {
    expect(toSignupData(draft(changes))).toBeNull();
  });
});

describe('reachableSignupStep', () => {
  const empty = { email: '', password: '' };
  const withEmail = { email: 'me@test.fr', password: '' };
  const withPassword = { email: 'me@test.fr', password: 'abcdefg1' };

  it('gives the requested step once the previous ones are filled', () => {
    expect(reachableSignupStep('1', withPassword)).toBe(1);
    expect(reachableSignupStep('2', withPassword)).toBe(2);
    expect(reachableSignupStep('3', withPassword)).toBe(3);
  });

  it('falls back to the first step missing', () => {
    expect(reachableSignupStep('2', empty)).toBe(1);
    expect(reachableSignupStep('3', empty)).toBe(1);
    expect(reachableSignupStep('3', withEmail)).toBe(2);
    expect(reachableSignupStep('3', { ...withEmail, password: 'short1' })).toBe(2);
    expect(reachableSignupStep('2', { ...withEmail, email: '   ' })).toBe(1);
  });

  it.each([undefined, null, '', '0', '4', 'two', ['2']])('gives the first step for %j', (step) => {
    expect(reachableSignupStep(step, withPassword)).toBe(1);
  });
});

describe('signupStepRoute', () => {
  it('puts the step in the query', () => {
    expect(signupStepRoute(2)).toEqual({ path: '/signup', query: { step: '2' } });
  });
});
