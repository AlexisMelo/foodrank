import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { RatingInput, RestaurantRating } from '@/types/rating'
import RestaurantView from '@/views/RestaurantView.vue'
import NewReviewView from '@/views/NewReviewView.vue'

// In-memory replacement of the API: ratings saved by rateRestaurant are returned by the fetch functions
const api = vi.hoisted(() => ({ ratings: [] as RestaurantRating[] }))

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ currentUserId: 'me' }) }))
vi.mock('@/services/restaurantService', () => ({
  fetchRestaurantById: vi.fn(async (id: string) => ({ id, name: 'Pizza Roma', emoji: '🍕' })),
  createRestaurantFromPlace: vi.fn(),
  fetchRestaurants: vi.fn(async () => []),
}))
vi.mock('@/services/ratingService', () => {
  /** Ratings of the restaurant, most recent first, like the API */
  const ofRestaurant = (restaurantId: string) =>
    api.ratings
      .filter((r) => r.restaurantId === restaurantId)
      .sort((a, b) => b.date.localeCompare(a.date))
  return {
    fetchCommunityVisitsByUserId: vi.fn(async () => []),
    fetchRecentRatings: vi.fn(async (id: string, limit = 5) => ofRestaurant(id).slice(0, limit)),
    fetchMyRatings: vi.fn(async (id: string) => ofRestaurant(id).filter((r) => r.userId === 'me')),
    rateRestaurant: vi.fn(async (restaurantId: string, rating: RatingInput) => {
      api.ratings.push({
        restaurantId,
        userId: 'me',
        date: '2026-10-09',
        food: rating.food,
        service: rating.service,
        setting: rating.setting,
        bonus: rating.bonus,
        userName: 'Me',
        userAvatarUrl: null,
      })
    }),
  }
})

/**
 * Opens `path` in an app holding the restaurant and rating pages, and waits for it to load.
 */
async function openApp(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/restaurant/:id', component: RestaurantView },
      { path: '/review/:id', component: NewReviewView },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  api.ratings = [
    {
      restaurantId: 'r1',
      userId: 'me',
      date: '2026-01-02',
      food: 50,
      service: 50,
      setting: 50,
      bonus: false,
      userName: 'Me',
      userAvatarUrl: null,
    },
  ]
})

describe('rating a restaurant from its page', () => {
  it('shows the new review on the restaurant page once saved', async () => {
    const { wrapper, router } = await openApp('/restaurant/r1')
    expect(wrapper.findAll('.visit-card')).toHaveLength(1)

    // "New" → rating page
    await wrapper.get('.add-chip').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/review/r1')

    const [food, service, decor] = wrapper.findAll('input[type="range"]')
    await food!.setValue('92')
    await service!.setValue('71')
    await decor!.setValue('40')
    await wrapper.get('.crush-toggle').trigger('click')
    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    // Back on the restaurant page, "My Visits" lists the new review first
    expect(router.currentRoute.value.fullPath).toBe('/restaurant/r1')
    const cards = wrapper.findAll('.visit-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('October 9, 2026')
    expect(cards[0]!.text()).toContain('💘')
    expect(cards[0]!.findAll('.criterion-score').map((s) => s.text())).toEqual(['92', '71', '40'])
    expect(cards[1]!.text()).toContain('January 2, 2026')

    // ...and so does "Recent"
    await wrapper.get('.tab-recent').trigger('click')
    expect(wrapper.findAll('.community-card')[0]!.text()).toContain('October 9, 2026')
  })
})
