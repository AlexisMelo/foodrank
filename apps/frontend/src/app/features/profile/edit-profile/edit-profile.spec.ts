import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { routes } from '@/app.routes';
import { RatingApi } from '@/core/api/rating-api';
import { TierlistApi } from '@/core/api/tierlist-api';
import { UserApi } from '@/core/api/user-api';
import { AuthStore } from '@/core/auth/auth-store';
import type { ProfileDetails } from '@/core/models/user.model';
import { CAN_REVIEW } from '@/core/review/daily-review-testing';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, textOf, typeIn } from '@/testing/dom-testing';

/**
 * Details of the logged-in user served by the fake API
 */
const DETAILS: ProfileDetails = {
  username: 'alexis.melo',
  displayName: 'Alexis Melo',
  avatarUrl: null,
  identity: 'man',
  age: 30,
};

describe('EditProfile', () => {
  let fetchProfileDetails: ReturnType<typeof vi.fn>;
  let updateProfileDetails: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    fetchProfileDetails = vi.fn(() => of(DETAILS));
    updateProfileDetails = vi.fn(() => of(DETAILS));
    TestBed.configureTestingModule({
      providers: [
        // The real routes, with a logged-in user
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthStore,
          useValue: { isLoggedIn: signal(true), loggedInUserId: signal('u1') },
        },
        // The profile page is opened once the details are saved
        {
          provide: UserApi,
          useValue: {
            fetchProfileDetails,
            updateProfileDetails,
            fetchUserProfile: () => of({ id: 'u1', ...DETAILS, ratedRestaurantsCount: 0 }),
            fetchFollowers: () => of([]),
            fetchFollowing: () => of([]),
          },
        },
        {
          provide: RatingApi,
          useValue: { fetchUserRatings: () => of([]), fetchRatingAllowance: () => of(CAN_REVIEW) },
        },
        { provide: TierlistApi, useValue: { fetchPinnedTierlistsByUserId: () => of([]) } },
      ],
    });
  });

  /**
   * Opens the edit profile page and waits for the details to load.
   */
  async function openPage(): Promise<void> {
    harness = await RouterTestingHarness.create('/profile/edit');
    await harness.fixture.whenStable();
  }

  /**
   * The Save button, at the top right.
   */
  function saveButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(harness.fixture, '.save-btn');
  }

  /**
   * Clicks Save, like the user does, and waits for the API call to settle.
   */
  async function clickSave(): Promise<void> {
    saveButton().click();
    await harness.fixture.whenStable();
  }

  /**
   * Value of the field `selector`.
   */
  function valueOf(selector: string): string {
    return query<HTMLInputElement | HTMLSelectElement>(harness.fixture, selector).value;
  }

  it('shows the avatar, then the display name, identity and age of the logged-in user', async () => {
    await openPage();

    expect(textOf(query(harness.fixture, '.avatar'))).toBe('A');
    expect(valueOf('#edit-display-name')).toBe('Alexis Melo');
    expect(valueOf('#edit-identity')).toBe('man');
    expect(valueOf('#edit-age')).toBe('30');
    expect(saveButton().disabled).toBe(false);
  });

  it('shows the username as the placeholder of an empty display name, and asks the identity and age of an older account', async () => {
    fetchProfileDetails.mockReturnValue(
      of({ ...DETAILS, displayName: null, identity: null, age: null }),
    );
    await openPage();

    const displayName = query<HTMLInputElement>(harness.fixture, '#edit-display-name');
    expect(displayName.value).toBe('');
    expect(displayName.placeholder).toBe('alexis.melo');
    expect(valueOf('#edit-identity')).toBe('');
    expect(saveButton().disabled).toBe(true);

    await typeIn(harness.fixture, '#edit-identity', 'woman');
    await typeIn(harness.fixture, '#edit-age', '25');
    expect(saveButton().disabled).toBe(false);
  });

  it('saves the trimmed display name, identity and age, then opens my profile with a confirmation', async () => {
    await openPage();

    await typeIn(harness.fixture, '#edit-display-name', '  Alex M. ');
    await typeIn(harness.fixture, '#edit-identity', 'non_binary');
    await typeIn(harness.fixture, '#edit-age', '31');
    await clickSave();

    expect(updateProfileDetails).toHaveBeenCalledExactlyOnceWith({
      displayName: 'Alex M.',
      identity: 'non_binary',
      age: 31,
    });
    expect(TestBed.inject(Router).url).toBe('/profile');
    expect(
      TestBed.inject(ToastStore)
        .toasts()
        .map((toast) => [toast.message, toast.kind]),
    ).toEqual([['Profile saved', 'success']]);
  });

  it('clears the display name when it is emptied, so the username is shown', async () => {
    await openPage();

    await typeIn(harness.fixture, '#edit-display-name', '   ');
    await clickSave();

    expect(updateProfileDetails).toHaveBeenCalledExactlyOnceWith({
      displayName: null,
      identity: 'man',
      age: 30,
    });
  });

  it('keeps Save disabled while the age is missing or invalid, and explains why', async () => {
    await openPage();

    await typeIn(harness.fixture, '#edit-age', '');
    expect(saveButton().disabled).toBe(true);
    expect(queryAll(harness.fixture, '.field-hint')).toHaveLength(0);

    await typeIn(harness.fixture, '#edit-age', '121');
    expect(saveButton().disabled).toBe(true);
    expect(textOf(query(harness.fixture, '.field-hint'))).toBe('Enter an age between 0 and 120.');
  });

  it('keeps Save disabled for a display name with an invisible character, and explains why', async () => {
    await openPage();

    await typeIn(harness.fixture, '#edit-display-name', `Alexis${String.fromCodePoint(0x202e)}`);

    expect(saveButton().disabled).toBe(true);
    expect(textOf(query(harness.fixture, '.field-hint'))).toBe(
      'Up to 30 characters, without line breaks nor invisible characters.',
    );
  });

  it('disables Save and the fields while saving, so the details are not sent twice', async () => {
    const answer = new Subject<ProfileDetails>();
    updateProfileDetails.mockReturnValue(answer);
    await openPage();

    await clickSave();
    expect(saveButton().disabled).toBe(true);
    expect(textOf(saveButton())).toBe('Saving...');
    expect(query<HTMLInputElement>(harness.fixture, '#edit-display-name').disabled).toBe(true);
    await clickSave();

    answer.next(DETAILS);
    answer.complete();
    await harness.fixture.whenStable();
    expect(updateProfileDetails).toHaveBeenCalledOnce();
  });

  it('explains a refused value and stays on the page', async () => {
    updateProfileDetails.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
    );
    await openPage();

    await clickSave();

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'Some of your information was refused. Please check it.',
    );
    expect(TestBed.inject(Router).url).toBe('/profile/edit');
    expect(saveButton().disabled).toBe(false);
  });

  it('explains another failure of the save', async () => {
    updateProfileDetails.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Unavailable' })),
    );
    await openPage();

    await clickSave();

    expect(textOf(query(harness.fixture, '.save-error'))).toBe(
      'Could not save your profile, try again.',
    );
  });

  it('explains when the details cannot be loaded, with Save disabled', async () => {
    fetchProfileDetails.mockReturnValue(throwError(() => new Error('503')));
    await openPage();

    expect(textOf(query(harness.fixture, '.load-error'))).toBe(
      "Couldn't load your profile, try again.",
    );
    expect(queryAll(harness.fixture, '#edit-display-name')).toHaveLength(0);
    expect(saveButton().disabled).toBe(true);
  });

  it('goes back to my profile from the back arrow', async () => {
    await openPage();

    expect(query(harness.fixture, '.back-link').getAttribute('href')).toBe('/profile');
  });
});
