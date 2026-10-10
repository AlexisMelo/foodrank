import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { UserRating } from '@/types/rating'
import type { Tierlist } from '@/types/tierlist'
import type { UserProfile } from '@/types/user'
import TierlistDetailView from '@/views/TierlistDetailView.vue'
import { fetchTierlistById } from '@/services/tierlistService'
import { fetchUserRatings } from '@/services/ratingService'
import { fetchUserProfile } from '@/services/userService'

vi.mock('@/services/tierlistService', () => ({ fetchTierlistById: vi.fn() }))
vi.mock('@/services/ratingService', () => ({ fetchUserRatings: vi.fn() }))
vi.mock('@/services/userService', () => ({ ME: 'me', fetchUserProfile: vi.fn() }))

const profiles: Record<string, UserProfile> = {
  me: { id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 1 },
  u1: { id: 'u1', name: 'Alexis Melo', avatarUrl: null, ratedRestaurantsCount: 1 },
  u2: { id: 'u2', name: 'Camille', avatarUrl: null, ratedRestaurantsCount: 2 },
}

/**
 * Builds a rating of `restaurantId` with the same score for the three criteria.
 */
function rating(restaurantId: string, score: number): UserRating {
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
  }
}

const ratings: Record<string, UserRating[]> = {
  me: [rating('r1', 40)],
  u1: [rating('r1', 40)],
  u2: [rating('r1', 60), rating('r2', 90), rating('elsewhere', 100)],
}

/**
 * Builds a tierlist of `userId` holding r1 and r2.
 */
function tierlistOf(userId: string): Tierlist {
  return {
    id: 7,
    userId,
    name: 'Date night',
    description: 'Candles and good wine',
    emoji: '🕯️',
    restaurants: ['r1', 'r2'].map((restaurantId) => ({ restaurantId, addedAt: null })),
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    pinned: true,
  }
}

/**
 * Opens the page of tierlist 7, and waits for it to load.
 */
async function openTierlist() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tierlists', component: { template: '<div class="tierlists-page" />' } },
      { path: '/tierlists/:id', component: TierlistDetailView },
      { path: '/user/:id', component: { template: '<div />' } },
      { path: '/restaurant/:id', component: { template: '<div />' } },
    ],
  })
  router.push('/tierlists/7')
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.mocked(fetchUserProfile).mockImplementation(async (id = 'me') => profiles[id])
  vi.mocked(fetchUserRatings).mockImplementation(async (id = 'me') => ratings[id] ?? [])
})

describe('TierlistDetailView', () => {
  it("shows the tierlist and its owner, its restaurants ranked by the owner's ratings", async () => {
    vi.mocked(fetchTierlistById).mockResolvedValue(tierlistOf('u2'))
    const { wrapper } = await openTierlist()

    expect(fetchTierlistById).toHaveBeenCalledWith('7')
    expect(wrapper.get('.title').text()).toBe('Date night')
    expect(wrapper.get('.description').text()).toBe('Candles and good wine')
    expect(wrapper.get('.owner-name').text()).toBe('Camille')
    expect(wrapper.get('.meta-chip').text()).toBe('2 restaurants')
    const items = wrapper.findAll('.list-item')
    expect(items.map((i) => i.get('.item-name').text())).toEqual(['Restaurant r2', 'Restaurant r1'])
    expect(items[0]!.get('.item-avg').text()).toBe('90')
  })

  it("shows my own score on someone else's tierlist, without letting me pin it", async () => {
    vi.mocked(fetchTierlistById).mockResolvedValue(tierlistOf('u2'))
    const { wrapper } = await openTierlist()

    const r1 = wrapper.findAll('.list-item').find((i) => i.text().includes('Restaurant r1'))!
    expect(r1.get('.my-score').text()).toBe('40')
    expect(wrapper.find('.pin-btn').exists()).toBe(false)
  })

  it('lets the owner pin their tierlist, without showing their score twice', async () => {
    vi.mocked(fetchTierlistById).mockResolvedValue(tierlistOf('u1'))
    const { wrapper } = await openTierlist()

    expect(wrapper.get('.pin-btn').text()).toBe('Pinned to profile')
    expect(wrapper.find('.my-score').exists()).toBe(false)
  })

  it('goes back to the tierlists for an unknown tierlist', async () => {
    vi.mocked(fetchTierlistById).mockResolvedValue(undefined)
    const { router } = await openTierlist()

    expect(router.currentRoute.value.path).toBe('/tierlists')
  })
})
