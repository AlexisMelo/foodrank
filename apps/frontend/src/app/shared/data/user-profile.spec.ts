import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { UserApi } from '@/core/api/user-api';
import type { UserProfile } from '@/core/models/user.model';
import { injectUserProfile } from './user-profile';

/**
 * Builds the profile of `id` named `name`.
 */
function profile(id: string, name: string): UserProfile {
  return { id, name, avatarUrl: null, ratedRestaurantsCount: 4 };
}

describe('injectUserProfile', () => {
  let fetchUserProfile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchUserProfile = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: UserApi, useValue: { fetchUserProfile } }],
    });
  });

  /**
   * Waits until every load started is done.
   */
  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it("loads the logged-in user's profile by default", async () => {
    fetchUserProfile.mockReturnValue(of(profile('u1', 'Alexis')));

    const { profile: loaded, loading } = TestBed.runInInjectionContext(() => injectUserProfile());
    expect(loading()).toBe(true);
    await settle();

    expect(fetchUserProfile).toHaveBeenCalledWith('me');
    expect(loaded()?.name).toBe('Alexis');
    expect(loaded()?.ratedRestaurantsCount).toBe(4);
    expect(loading()).toBe(false);
  });

  it('reports an unknown user', async () => {
    fetchUserProfile.mockReturnValue(of(undefined));

    const { profile: loaded, notFound } = TestBed.runInInjectionContext(() =>
      injectUserProfile(() => 'unknown'),
    );
    await settle();

    expect(fetchUserProfile).toHaveBeenCalledWith('unknown');
    expect(notFound()).toBe(true);
    expect(loaded()).toBeNull();
  });

  it('reports an error when the API fails', async () => {
    fetchUserProfile.mockReturnValue(throwError(() => new Error('503')));

    const {
      profile: loaded,
      loadError,
      notFound,
      loading,
    } = TestBed.runInInjectionContext(() => injectUserProfile());
    await settle();

    expect(loadError()).toBe(true);
    expect(notFound()).toBe(false);
    expect(loaded()).toBeNull();
    expect(loading()).toBe(false);
  });

  it('reloads when the user changes and ignores the late answer of the previous one', async () => {
    const first = new Subject<UserProfile>();
    fetchUserProfile.mockReturnValueOnce(first).mockReturnValueOnce(of(profile('u2', 'Camille')));
    const userId = signal('u1');

    const { profile: loaded } = TestBed.runInInjectionContext(() => injectUserProfile(userId));
    // Starts loading u1 before the user changes
    TestBed.tick();
    userId.set('u2');
    await settle();
    first.next(profile('u1', 'Old'));
    await settle();

    expect(fetchUserProfile.mock.calls).toEqual([['u1'], ['u2']]);
    expect(loaded()?.name).toBe('Camille');
  });
});
