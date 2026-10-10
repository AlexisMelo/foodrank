import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { UserProfile } from '@/types/user'
import type { UserRating } from '@/types/rating'
import ProfileView from '@/views/ProfileView.vue'
import { fetchUserRatings } from '@/services/ratingService'
import { fetchUserProfile } from '@/services/userService'

vi.mock('@/services/tierlistService', () => ({
  fetchPinnedTierlistsByUserId: vi.fn(async () => []),
}))
vi.mock('@/services/ratingService', () => ({ fetchUserRatings: vi.fn() }))
vi.mock('@/services/userService', () => ({
  ME: 'me',
  fetchUserProfile: vi.fn(),
}))

const profiles: Record<string, UserProfile> = {
  me: { id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 2 },
  u2: { id: 'u2', name: 'Camille', avatarUrl: null, ratedRestaurantsCount: 2 },
}

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number, isActive = true): UserRating {
  return {
    restaurantId,
    restaurantName: `Restaurant ${restaurantId}`,
    restaurantEmoji: '🍕',
    restaurantCuisine: 'Italian',
    date: '2026-03-07',
    food: score,
    service: score,
    setting: score,
    bonus: false,
    isActive,
  }
}

const ratings: Record<string, UserRating[]> = {
  // r1 rated twice: listed once, with the latest (active) rating
  me: [rating('r1', 70), rating('r2', 90), rating('r1', 80, false)],
  u2: [rating('r1', 50), rating('r3', 95)],
}

/**
 * Opens `path` in an app holding the profile pages, and waits for it to load.
 */
async function openApp(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div class="home-page" />' } },
      { path: '/profile', component: ProfileView },
      { path: '/user/:id', component: ProfileView },
      { path: '/restaurant/:id', component: { template: '<div />' } },
      { path: '/review/:id', component: { template: '<div />' } },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.mocked(fetchUserProfile).mockImplementation(async (id = 'me') => profiles[id])
  vi.mocked(fetchUserRatings).mockImplementation(async (id = 'me') => ratings[id] ?? [])
})

describe('ProfileView', () => {
  it("shows the logged-in user's real name and number of restaurants rated", async () => {
    const { wrapper } = await openApp('/profile')

    expect(wrapper.get('.winner-name').text()).toBe('Alexis Melo')
    expect(wrapper.get('.winner-tag').text()).toBe('2 restaurants')
    expect(wrapper.get('.winner-avatar').text()).toBe('A')
  })

  it('ranks the restaurants the user rated, best first, each listed once', async () => {
    const { wrapper } = await openApp('/profile')

    const items = wrapper.findAll('.list-item')
    expect(items.map((i) => i.get('.item-name').text())).toEqual(['Restaurant r2', 'Restaurant r1'])
    expect(items[1]!.get('.item-avg').text()).toBe('70')
    expect(wrapper.find('.my-score').exists()).toBe(false)
  })

  it('explains when the user has not rated any restaurant', async () => {
    vi.mocked(fetchUserRatings).mockResolvedValue([])
    const { wrapper } = await openApp('/profile')

    expect(wrapper.get('.empty').text()).toContain('No restaurant rated yet')
  })

  it("shows another user's profile with my own score, or a link to rate", async () => {
    const { wrapper } = await openApp('/user/u2')

    expect(fetchUserProfile).toHaveBeenCalledWith('u2')
    expect(wrapper.get('.winner-name').text()).toBe('Camille')
    const items = wrapper.findAll('.list-item')
    expect(items.map((i) => i.get('.item-name').text())).toEqual(['Restaurant r3', 'Restaurant r1'])
    // Never rated r3: offer to rate it
    expect(items[0]!.find('.my-score-rate').exists()).toBe(true)
    // Rated r1 twice (70, then 80 before): my active rating
    expect(items[1]!.get('.my-score').text()).toBe('70')
  })

  it('goes back home for an unknown user', async () => {
    const { router } = await openApp('/user/unknown')

    expect(router.currentRoute.value.path).toBe('/')
  })
})
