import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import type { UserProfile } from '@/types/user'
import { useUserProfile } from '@/composables/useUserProfile'
import { fetchUserProfile } from '@/services/userService'

vi.mock('@/services/userService', () => ({ ME: 'me', fetchUserProfile: vi.fn() }))

/**
 * Builds the profile of `id` named `name`.
 */
function profile(id: string, name: string): UserProfile {
  return { id, name, avatarUrl: null, ratedRestaurantsCount: 4 }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useUserProfile', () => {
  it("loads the logged-in user's profile by default", async () => {
    vi.mocked(fetchUserProfile).mockResolvedValue(profile('u1', 'Alexis'))

    const { profile: loaded, loading } = useUserProfile()
    expect(loading.value).toBe(true)
    await flushPromises()

    expect(fetchUserProfile).toHaveBeenCalledWith('me')
    expect(loaded.value?.name).toBe('Alexis')
    expect(loaded.value?.ratedRestaurantsCount).toBe(4)
    expect(loading.value).toBe(false)
  })

  it('reports an unknown user', async () => {
    vi.mocked(fetchUserProfile).mockResolvedValue(undefined)

    const { profile: loaded, notFound } = useUserProfile('unknown')
    await flushPromises()

    expect(notFound.value).toBe(true)
    expect(loaded.value).toBeNull()
  })

  it('reports an error when the API fails', async () => {
    vi.mocked(fetchUserProfile).mockRejectedValue(new Error('503'))

    const { profile: loaded, loadError, notFound, loading } = useUserProfile()
    await flushPromises()

    expect(loadError.value).toBe(true)
    expect(notFound.value).toBe(false)
    expect(loaded.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('reloads when the user changes and ignores the late answer of the previous one', async () => {
    let resolveFirst!: (p: UserProfile) => void
    vi.mocked(fetchUserProfile)
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(profile('u2', 'Camille'))
    const userId = shallowRef('u1')

    const { profile: loaded } = useUserProfile(userId)
    userId.value = 'u2'
    await flushPromises()
    resolveFirst(profile('u1', 'Old'))
    await flushPromises()

    expect(loaded.value?.name).toBe('Camille')
  })
})
