import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RestaurantRating } from '@/types/rating'
import RestaurantRatingsTabs from '@/components/RestaurantRatingsTabs.vue'

/**
 * Builds a rating by `userName` on `date`.
 */
function rating(userName: string, date: string, overrides: Partial<RestaurantRating> = {}) {
  return {
    restaurantId: 'r1',
    userId: userName.toLowerCase(),
    date,
    food: 90,
    service: 60,
    setting: 30,
    bonus: false,
    isActive: true,
    userName,
    userAvatarUrl: null,
    ...overrides,
  } satisfies RestaurantRating
}

/**
 * Mounts the tabs with the given props (no rating, nothing loading by default).
 */
function mountTabs(props: Partial<InstanceType<typeof RestaurantRatingsTabs>['$props']> = {}) {
  return mount(RestaurantRatingsTabs, {
    props: {
      restaurantId: 'r1',
      myRatings: [],
      recentRatings: [],
      loading: false,
      loadError: false,
      ...props,
    },
    // The "New" chip needs the router; it is not what is tested here
    global: { stubs: { NewReviewChip: true } },
  })
}

describe('RestaurantRatingsTabs', () => {
  it("shows the user's own ratings first, with their date and scores", () => {
    const wrapper = mountTabs({
      myRatings: [rating('Me', '2026-03-07', { bonus: true }), rating('Me', '2026-01-02')],
      recentRatings: [rating('Camille', '2026-03-08')],
    })

    const cards = wrapper.findAll('.visit-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('March 7, 2026')
    expect(cards[0]!.text()).toContain('💘')
    expect(cards[0]!.findAll('.criterion-score').map((s) => s.text())).toEqual(['90', '60', '30'])
    expect(cards[0]!.get('.visit-avg').text()).toBe('60')
    expect(cards[1]!.text()).toContain('January 2, 2026')
    expect(cards[1]!.text()).not.toContain('💘')
    expect(wrapper.text()).not.toContain('Camille')
  })

  it('dims my previous ratings, replaced by a more recent one', () => {
    const wrapper = mountTabs({
      myRatings: [rating('Me', '2026-03-07'), rating('Me', '2026-01-02', { isActive: false })],
    })

    expect(wrapper.findAll('.visit-card').map((c) => c.classes('inactive'))).toEqual([false, true])
  })

  it('shows the recent ratings of every user under "Recent"', async () => {
    const wrapper = mountTabs({
      myRatings: [rating('Me', '2026-03-07')],
      recentRatings: [rating('Camille', '2026-03-08'), rating('Me', '2026-03-07')],
    })

    await wrapper.get('.tab-recent').trigger('click')

    const cards = wrapper.findAll('.community-card')
    expect(cards.map((c) => c.get('.community-name').text())).toEqual(['Camille', 'Me'])
    expect(cards[0]!.text()).toContain('March 8, 2026')
    expect(cards[0]!.get('.community-avatar').text()).toBe('C')
    expect(wrapper.find('.visit-card').exists()).toBe(false)
  })

  it("shows the author's picture when there is one", async () => {
    const wrapper = mountTabs({
      recentRatings: [rating('Camille', '2026-03-08', { userAvatarUrl: 'https://img.test/c.png' })],
    })

    await wrapper.get('.tab-recent').trigger('click')

    expect(wrapper.get('img.community-avatar').attributes('src')).toBe('https://img.test/c.png')
  })

  it('explains when there is no rating in the selected tab', async () => {
    const wrapper = mountTabs({ recentRatings: [rating('Camille', '2026-03-08')] })

    expect(wrapper.text()).toContain('No visits yet')

    await wrapper.get('.tab-recent').trigger('click')
    expect(wrapper.text()).not.toContain('No recent visits')

    await wrapper.setProps({ recentRatings: [] })
    expect(wrapper.text()).toContain('No recent visits')
  })

  it('shows the loading state, then the error, instead of an empty list', async () => {
    const wrapper = mountTabs({ loading: true })
    expect(wrapper.text()).toContain('Loading')
    expect(wrapper.text()).not.toContain('No visits yet')

    await wrapper.setProps({ loading: false, loadError: true })
    expect(wrapper.get('.load-error').text()).toBe("Couldn't load the ratings")
  })
})
