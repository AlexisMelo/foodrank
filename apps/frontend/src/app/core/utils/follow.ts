/**
 * Text of the follow button of another user's profile: "Following" once the logged-in user follows them (tapping it
 * unfollows), else "Follow back" when they already follow the logged-in user, else "Follow"
 * @param following the logged-in user follows the user shown
 * @param followsMe the user shown follows the logged-in user
 */
export function followButtonLabel(
  following: boolean,
  followsMe: boolean,
): 'Following' | 'Follow back' | 'Follow' {
  if (following) return 'Following';
  return followsMe ? 'Follow back' : 'Follow';
}

/**
 * Label of a number of followers: "1 follower", "3 followers", "0 followers"
 */
export function followersCountLabel(count: number): string {
  return `${count} follower${count === 1 ? '' : 's'}`;
}
