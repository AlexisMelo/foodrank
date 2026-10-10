import { readonly, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { RatingSummary, RestaurantRating } from '@/types/rating'
import { fetchMyRatings, fetchRatingSummary, fetchRecentRatings } from '@/services/ratingService'

/** Number of ratings shown in the "Recent" tab. */
export const RECENT_RATINGS_COUNT = 5

/**
 * Ratings displayed on a restaurant page: the most recent ones (every user), all of the logged-in user's, and the
 * averages of every active rating.
 * Reloaded from the API each time the restaurant id changes, so a rating saved just before opening the page is shown.
 * State is per call (not shared between pages).
 * @param restaurantId nothing is loaded while it is null
 */
export function useRestaurantRatings(restaurantId: MaybeRefOrGetter<string | null>) {
  const recentRatings = ref<RestaurantRating[]>([])
  const myRatings = ref<RestaurantRating[]>([])
  /** Null until loaded */
  const summary = shallowRef<RatingSummary | null>(null)
  const loading = shallowRef(false)
  const loadError = shallowRef(false)

  watch(
    () => toValue(restaurantId),
    async (id, _previous, onCleanup) => {
      // Ignore the answer of a previous restaurant if the id changed in the meantime
      let cancelled = false
      onCleanup(() => (cancelled = true))

      recentRatings.value = []
      myRatings.value = []
      summary.value = null
      loadError.value = false
      if (!id) return

      loading.value = true
      try {
        const [recent, mine, averages] = await Promise.all([
          fetchRecentRatings(id, RECENT_RATINGS_COUNT),
          fetchMyRatings(id),
          fetchRatingSummary(id),
        ])
        if (cancelled) return
        recentRatings.value = recent
        myRatings.value = mine
        summary.value = averages
      } catch {
        if (!cancelled) loadError.value = true
      } finally {
        if (!cancelled) loading.value = false
      }
    },
    { immediate: true },
  )

  return {
    recentRatings: readonly(recentRatings),
    myRatings: readonly(myRatings),
    summary: readonly(summary),
    loading: readonly(loading),
    loadError: readonly(loadError),
  }
}
