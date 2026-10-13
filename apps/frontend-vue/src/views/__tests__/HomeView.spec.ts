import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { UserRating } from '@/types/rating'
import HomeView from '@/views/HomeView.vue'
import { fetchUserRatings } from '@/services/ratingService'
import { fetchUserProfile } from '@/services/userService'

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ currentUserId: 'alex' }) }))
vi.mock('@/services/restaurantService', () => ({ fetchRestaurants: vi.fn(async () => []) }))
vi.mock('@/services/ratingService', () => ({
  fetchCommunityVisitsByUserId: vi.fn(async () => []),
  fetchUserRatings: vi.fn(),
}))
vi.mock('@/services/tierlistService', () => ({ fetchTierlistsByUserId: vi.fn(async () => []) }))
vi.mock('@/services/userService', () => ({ ME: 'me', fetchUserProfile: vi.fn() }))

/**
 * Builds a rating of `restaurantId` given on `date`.
 */
function rating(restaurantId: string, date: string): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date,
    food: 90,
    service: 60,
    setting: 30,
    bonus: false,
    isActive: true,
  }
}

/**
 * Opens the home page in an app that also has a profile page, and waits for it to load.
 */
async function openHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/profile', component: { template: '<div class="profile-page" />' } },
      { path: '/restaurant/:id', component: { template: '<div class="restaurant-page" />' } },
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
  vi.mocked(fetchUserRatings).mockResolvedValue([])
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

describe('HomeView recent reviews', () => {
  it('shows the last 5 reviews of the logged-in user, most recent first', async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => rating(`r${i}`, `2026-10-0${8 - i}`)),
    )
    const { wrapper } = await openHome()

    expect(fetchUserRatings).toHaveBeenCalledWith('me')
    const cards = wrapper.findAll('.review-card')
    expect(cards.map((c) => c.get('.restaurant-name').text())).toEqual([
      'Restaurant r0',
      'Restaurant r1',
      'Restaurant r2',
      'Restaurant r3',
      'Restaurant r4',
    ])
    expect(cards[0]!.get('.visit-date').text()).toBe('Oct 8')
    expect(cards[0]!.findAll('.criterion-score').map((s) => s.text())).toEqual(['90', '60', '30'])
  })

  it('dims a previous review, replaced by a more recent one of the same restaurant', async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue([
      rating('r1', '2026-10-08'),
      { ...rating('r1', '2026-10-01'), isActive: false },
    ])
    const { wrapper } = await openHome()

    expect(wrapper.findAll('.review-card').map((c) => c.classes('inactive'))).toEqual([false, true])
  })

  it('opens the restaurant page when a review is clicked', async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue([rating('r1', '2026-10-08')])
    const { wrapper, router } = await openHome()

    await wrapper.get('.review-card').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/restaurant/r1')
  })

  it('explains when the user has not reviewed any restaurant', async () => {
    const { wrapper } = await openHome()

    expect(wrapper.findAll('.review-card')).toHaveLength(0)
    expect(wrapper.get('.empty').text()).toContain('No review yet')
  })

  it('explains when the reviews could not be loaded', async () => {
    vi.mocked(fetchUserRatings).mockRejectedValue(new Error('503'))
    const { wrapper } = await openHome()

    expect(wrapper.get('.empty').text()).toBe("Couldn't load your reviews")
  })
})
