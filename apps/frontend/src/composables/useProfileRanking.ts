import { computed, readonly, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { UserRating } from '@/types/rating'
import { fetchUserRatings } from '@/services/ratingService'
import { ME } from '@/services/userService'
import { overallByRestaurant, rankRestaurants } from '@/utils/ranking'

/**
 * Restaurants rated by a user, best first, as shown on a profile page.
 * On another user's profile, each restaurant also carries the logged-in user's own average ("myScore"),
 * undefined when the logged-in user never rated it.
 * @param userId id of the user, "me" (default) for the logged-in user
 */
export function useProfileRanking(userId: MaybeRefOrGetter<string> = ME) {
  const userRatings = shallowRef<UserRating[]>([])
  // Only loaded on another user's profile
  const myRatings = shallowRef<UserRating[]>([])
  const loading = shallowRef(true)
  const loadError = shallowRef(false)

  const isOwnProfile = computed(() => toValue(userId) === ME)

  watch(
    () => toValue(userId),
    async (id, _previous, onCleanup) => {
      let cancelled = false
      onCleanup(() => (cancelled = true))

      loading.value = true
      loadError.value = false
      try {
        const [ratings, mine] = await Promise.all([
          fetchUserRatings(id),
          id === ME ? Promise.resolve([]) : fetchUserRatings(ME),
        ])
        if (cancelled) return
        userRatings.value = ratings
        myRatings.value = mine
      } catch {
        if (cancelled) return
        userRatings.value = []
        myRatings.value = []
        loadError.value = true
      } finally {
        if (!cancelled) loading.value = false
      }
    },
    { immediate: true },
  )

  const rankedRestaurants = computed(() => {
    const myScores = overallByRestaurant(myRatings.value)
    return rankRestaurants(userRatings.value).map((restaurant) => ({
      ...restaurant,
      myScore: isOwnProfile.value ? undefined : myScores.get(restaurant.restaurantId),
    }))
  })

  return {
    rankedRestaurants,
    isOwnProfile,
    loading: readonly(loading),
    loadError: readonly(loadError),
  }
}
