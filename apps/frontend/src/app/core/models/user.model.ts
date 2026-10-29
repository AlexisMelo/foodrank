/**
 * User listed among others (GET /api/users/search, /api/users/:id/followers and /following): only what a row shows.
 * The API gives no number of restaurants rated here, which would read the ratings of every user listed.
 */
export interface UserSummary {
  /**
   * Id of the user, used in /user/:id
   */
  id: string;

  /**
   * User name (pseudonym), else "Anonymous"
   */
  name: string;

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
   * Pseudonym displayed for the user, trimmed
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
   * Pseudonym as typed, not trimmed yet
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
