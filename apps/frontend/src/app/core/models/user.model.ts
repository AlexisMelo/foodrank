/**
 * User listed among others (GET /api/users/search, /api/users/:id/followers, /following and /friends): only what a
 * row shows.
 * The API gives no number of restaurants rated here, which would read the ratings of every user listed.
 */
export interface UserSummary {
  /**
   * Id of the user, used in /user/:id
   */
  id: string;

  /**
   * Unique username, chosen when signing up and never changed (lowercase letters, numbers, "." and "_")
   */
  username: string;

  /**
   * Name the user chose to be shown, null when there is none: the username is shown instead (see `displayedName`)
   */
  displayName: string | null;

  /**
   * Profile picture, null when there is none
   */
  avatarUrl: string | null;
}

/**
 * Profile of a user (GET /api/users/:id or /api/users/me): their summary with the number of restaurants rated.
 */
export interface UserProfile extends UserSummary {
  /**
   * Number of distinct restaurants rated (a restaurant rated twice counts once)
   */
  ratedRestaurantsCount: number;
}

/**
 * Identity chosen when signing up (profiles.identity).
 */
export type Identity = 'man' | 'woman' | 'non_binary';

/**
 * Profile of the logged-in user as they edit it (GET and PUT /api/users/me/details): what the edit profile page shows
 * and the fields it edits. Identity and age are private: the API returns them to the user themselves only.
 */
export interface ProfileDetails {
  /**
   * Unique username, never changed
   */
  username: string;

  /**
   * Name the user chose to be shown, null when there is none: the username is shown instead
   */
  displayName: string | null;

  /**
   * Profile picture, null when there is none
   */
  avatarUrl: string | null;

  /**
   * Identity chosen when signing up; null for older accounts
   */
  identity: Identity | null;

  /**
   * Age this year, computed by the API from the birth year it stores; null for older accounts
   */
  age: number | null;
}

/**
 * Body of PUT /api/users/me/details: every field of the edit profile page.
 */
export interface ProfileDetailsUpdate {
  /**
   * Trimmed display name, null to show the username (see `normalizeDisplayName`)
   */
  displayName: string | null;

  /**
   * Identity chosen
   */
  identity: Identity;

  /**
   * Age in years; the API stores the birth year it gives instead
   */
  age: number;
}

/**
 * Fields of the edit profile page as entered.
 */
export interface ProfileDetailsDraft {
  /**
   * Display name as typed, not trimmed yet; '' to show the username
   */
  displayName: string;

  /**
   * '' while no identity is chosen (older accounts)
   */
  identity: Identity | '';

  /**
   * Null while empty: the value Signal Forms gives an empty number input
   */
  age: number | null;
}

/**
 * Body of POST /api/auth/signup: everything entered in the sign up steps.
 */
export interface SignupData {
  /**
   * Email used to log in
   */
  email: string;

  /**
   * Password, following the rules of passwordCriteria
   */
  password: string;

  /**
   * Unique username, trimmed and in lowercase (see `normalizeUsername`)
   */
  username: string;

  /**
   * Age in years; the API stores the birth year it gives instead
   */
  age: number;

  /**
   * Identity chosen on the personal data step
   */
  identity: Identity;
}

/**
 * Sign up being filled, step after step.
 */
export interface SignupDraft {
  /**
   * Email entered on the first step, '' until then
   */
  email: string;

  /**
   * Password entered on the second step, '' until then; kept in memory only, and emptied when leaving the sign up
   */
  password: string;

  /**
   * Username as typed, not trimmed nor lowercased yet
   */
  username: string;

  /**
   * Null while empty: the value Signal Forms gives an empty number input
   */
  age: number | null;

  /**
   * '' until an identity is chosen
   */
  identity: Identity | '';
}
