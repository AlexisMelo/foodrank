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
    fetchRecentRatings: vi.fn(async (id: string, limit = 5) =>
      ofRestaurant(id)
        .filter((r) => r.isActive)
        .slice(0, limit),
    ),
    fetchMyRatings: vi.fn(async (id: string) => ofRestaurant(id).filter((r) => r.userId === 'me')),
    fetchRatingSummary: vi.fn(async (id: string) => {
      // Like the API: averages of the active ratings, null when there is none
      const active = ofRestaurant(id).filter((r) => r.isActive)
      const average = (scores: number[]) =>
        scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
      return {
        count: active.length,
        food: average(active.map((r) => r.food)),
        service: average(active.map((r) => r.service)),
        setting: average(active.map((r) => r.setting)),
        global: average(active.flatMap((r) => [r.food, r.service, r.setting])),
      }
    }),
    rateRestaurant: vi.fn(async (restaurantId: string, rating: RatingInput) => {
      // Like the API, the new rating becomes the active one: the previous ones are kept, inactive
      for (const previous of api.ratings) {
        if (previous.restaurantId === restaurantId && previous.userId === 'me')
          previous.isActive = false
      }
      api.ratings.push({
        restaurantId,
        userId: 'me',
        date: '2026-10-09',
        food: rating.food,
        service: rating.service,
        setting: rating.setting,
        bonus: rating.bonus,
        isActive: true,
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
      isActive: true,
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
    // The new review is the active one: the previous one stays, dimmed
    expect(cards.map((c) => c.classes('inactive'))).toEqual([false, true])

    // ..."Recent" shows only the new one, in place of the previous one
    await wrapper.get('.tab-recent').trigger('click')
    const recentCards = wrapper.findAll('.community-card')
    expect(recentCards).toHaveLength(1)
    expect(recentCards[0]!.text()).toContain('October 9, 2026')
  })

  it("shows the restaurant's global rating and criteria averages, updated after a new rating", async () => {
    const other = { ...api.ratings[0]!, userId: 'camille', userName: 'Camille' }
    api.ratings.push(
      { ...other, food: 90, service: 60, setting: 30 },
      // A previous rating of Camille, replaced: not counted
      { ...other, date: '2025-12-01', food: 0, service: 0, setting: 0, isActive: false },
    )

    const { wrapper, router } = await openApp('/restaurant/r1')

    // (50 + 50 + 50 + 90 + 60 + 30) / 6
    expect(wrapper.get('.global-score').text()).toBe('55')
    expect(wrapper.findAll('.criteria-averages .criterion-score').map((s) => s.text())).toEqual([
      '70',
      '55',
      '40',
    ])
    expect(wrapper.get('.rating-count').text()).toBe('2 ratings')

    // A new rating replaces the user's previous one in the averages
    await router.push('/review/r1')
    await flushPromises()
    const [food, service, decor] = wrapper.findAll('input[type="range"]')
    await food!.setValue('92')
    await service!.setValue('71')
    await decor!.setValue('40')
    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    // (92 + 71 + 40 + 90 + 60 + 30) / 6 = 63.8
    expect(wrapper.get('.global-score').text()).toBe('64')
    expect(wrapper.findAll('.criteria-averages .criterion-score').map((s) => s.text())).toEqual([
      '91',
      '66',
      '35',
    ])
  })

  it('shows no global rating while nobody rated the restaurant', async () => {
    api.ratings = []

    const { wrapper } = await openApp('/restaurant/r1')

    expect(wrapper.find('.global-score').exists()).toBe(false)
    expect(wrapper.get('.criteria-averages').text()).toContain('No ratings yet')
  })
})
