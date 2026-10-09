import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { fetchUserProfile } from '@/services/userService'

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ currentUserId: 'alex' }) }))
vi.mock('@/services/restaurantService', () => ({ fetchRestaurants: vi.fn(async () => []) }))
vi.mock('@/services/ratingService', () => ({ fetchCommunityVisitsByUserId: vi.fn(async () => []) }))
vi.mock('@/services/tierlistService', () => ({ fetchTierlistsByUserId: vi.fn(async () => []) }))
vi.mock('@/services/userService', () => ({ ME: 'me', fetchUserProfile: vi.fn() }))

/**
 * Opens the home page in an app that also has a profile page, and waits for it to load.
 */
async function openHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/profile', component: { template: '<div class="profile-page" />' } },
    ],
  })
  router.push('/')
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.mocked(fetchUserProfile).mockResolvedValue({
    id: 'u1',
    name: 'Alexis Melo',
    avatarUrl: null,
    ratedRestaurantsCount: 3,
  })
})

describe('HomeView top bar', () => {
  it("shows the logged-in user's real name and number of restaurants rated", async () => {
    const { wrapper } = await openHome()

    expect(fetchUserProfile).toHaveBeenCalledWith('me')
    expect(wrapper.get('.user-name').text()).toBe('Alexis Melo')
    expect(wrapper.get('.user-visited').text()).toBe('3 restaurants')
    expect(wrapper.get('.user-avatar').text()).toBe('A')
    expect(wrapper.text()).not.toContain('Alex Dupont')
  })

  it('shows the profile picture when the user has one', async () => {
    vi.mocked(fetchUserProfile).mockResolvedValue({
      id: 'u1',
      name: 'Alexis Melo',
      avatarUrl: 'https://img.test/me.png',
      ratedRestaurantsCount: 1,
    })
    const { wrapper } = await openHome()

    expect(wrapper.get('img.user-avatar').attributes('src')).toBe('https://img.test/me.png')
    expect(wrapper.get('.user-visited').text()).toBe('1 restaurant')
  })

  it('opens the profile page when clicked', async () => {
    const { wrapper, router } = await openHome()

    await wrapper.get('.user-bar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/profile')
  })
})
