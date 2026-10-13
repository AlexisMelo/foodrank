import { readonly, shallowRef } from 'vue'
import type { UserRating } from '@/types/rating'
import { fetchUserRatings } from '@/services/ratingService'
import { ME } from '@/services/userService'

/**
 * Last ratings given by the logged-in user, most recent first, loaded from the API.
 * State is per call so each page shows fresh data (e.g. right after a new rating).
 * @param limit number of ratings kept
 */
export function useMyRecentRatings(limit = 5) {
  const ratings = shallowRef<UserRating[]>([])
  const loading = shallowRef(true)
  const loadError = shallowRef(false)

  async function load() {
    try {
      ratings.value = (await fetchUserRatings(ME)).slice(0, limit)
    } catch {
      loadError.value = true
    } finally {
      loading.value = false
    }
  }
  void load()

  return {
    ratings: readonly(ratings),
    loading: readonly(loading),
    loadError: readonly(loadError),
  }
}
