import { readonly, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { UserProfile } from '@/types/user'
import { fetchUserProfile, ME } from '@/services/userService'

/**
 * Profile of a user (name, avatar, number of restaurants rated), loaded from the API.
 * Reloaded each time the id changes; state is per call so each page shows fresh data (e.g. the restaurants count
 * right after a new rating).
 * @param userId id of the user, "me" (default) for the logged-in user
 */
export function useUserProfile(userId: MaybeRefOrGetter<string> = ME) {
  const profile = ref<UserProfile | null>(null)
  const loading = shallowRef(true)
  const notFound = shallowRef(false)
  const loadError = shallowRef(false)

  watch(
    () => toValue(userId),
    async (id, _previous, onCleanup) => {
      // Ignore the answer for a previous user if the id changed in the meantime
      let cancelled = false
      onCleanup(() => (cancelled = true))

      loading.value = true
      notFound.value = false
      loadError.value = false
      try {
        const found = await fetchUserProfile(id)
        if (cancelled) return
        profile.value = found ?? null
        notFound.value = !found
      } catch {
        if (!cancelled) {
          profile.value = null
          loadError.value = true
        }
      } finally {
        if (!cancelled) loading.value = false
      }
    },
    { immediate: true },
  )

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    notFound: readonly(notFound),
    loadError: readonly(loadError),
  }
}
