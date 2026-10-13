import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import type { Tierlist, TierlistInput } from '@/types/tierlist'
import TierlistsView from '@/views/TierlistsView.vue'
import TierlistCreateView from '@/views/TierlistCreateView.vue'

// In-memory replacement of the API: tierlists created by createTierlist are returned by fetchTierlistsByUserId
const api = vi.hoisted(() => ({ tierlists: [] as Tierlist[], loadFails: false }))

vi.mock('@/services/tierlistService', () => ({
  fetchTierlistsByUserId: vi.fn(async () => {
    if (api.loadFails) throw new Error('503')
    // Most recently created first, like the API
    return [...api.tierlists].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }),
  createTierlist: vi.fn(async (input: TierlistInput) => {
    const now = new Date().toISOString()
    api.tierlists.push({
      ...input,
      id: api.tierlists.length + 1,
      userId: 'u1',
      restaurants: [],
      createdAt: now,
      updatedAt: now,
    })
  }),
}))

/**
 * Stores a tierlist of the logged-in user.
 */
function addTierlist(
  name: string,
  createdAt: string,
  updatedAt = createdAt,
  restaurantCount = 0,
  pinned = false,
): void {
  api.tierlists.push({
    id: api.tierlists.length + 1,
    userId: 'u1',
    name,
    description: null,
    emoji: '🏆',
    restaurants: Array.from({ length: restaurantCount }, (_, i) => ({
      restaurantId: `r${i}`,
      addedAt: updatedAt,
    })),
    createdAt,
    updatedAt,
    pinned,
  })
}

/**
 * Opens `path` in an app holding the tierlist pages, and waits for it to load. Attached to the document, so the
 * creation form is submitted by a click on Create, like in the browser.
 */
async function openApp(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tierlists', component: TierlistsView },
      { path: '/tierlists/new', component: TierlistCreateView },
      { path: '/tierlists/:id', component: { template: '<div class="detail-page" />' } },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

/**
 * Names of the tierlists listed, in display order.
 */
function listedNames(wrapper: Awaited<ReturnType<typeof openApp>>['wrapper']) {
  return wrapper.findAll('.tierlist-card .name').map((n) => n.text())
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  api.tierlists = []
  api.loadFails = false
})

describe('TierlistsView', () => {
  it("lists the logged-in user's tierlists, most recently created first, with their restaurant count", async () => {
    addTierlist('Old favorites', '2026-01-01T10:00:00Z', '2026-01-01T10:00:00Z', 1)
    addTierlist('Fresh picks', '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 3)
    const { wrapper } = await openApp('/tierlists')

    expect(listedNames(wrapper)).toEqual(['Fresh picks', 'Old favorites'])
    const counts = wrapper.findAll('.tierlist-card .count').map((c) => c.text())
    expect(counts).toEqual(['3 restaurants', '1 restaurant'])
  })

  it('sorts the tierlists by last update or by name', async () => {
    addTierlist('Burgers', '2026-01-01T10:00:00Z', '2026-10-01T10:00:00Z')
    addTierlist('Sushi', '2026-05-01T10:00:00Z')
    addTierlist('Arepas', '2026-03-01T10:00:00Z')
    const { wrapper } = await openApp('/tierlists')

    await wrapper
      .findAll('.sort-chip')
      .find((c) => c.text() === 'Recently updated')!
      .trigger('click')
    expect(listedNames(wrapper)).toEqual(['Burgers', 'Sushi', 'Arepas'])

    await wrapper
      .findAll('.sort-chip')
      .find((c) => c.text() === 'A–Z')!
      .trigger('click')
    expect(listedNames(wrapper)).toEqual(['Arepas', 'Burgers', 'Sushi'])
  })

  it('marks the tierlists pinned to the profile', async () => {
    addTierlist('Pinned picks', '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z', 0, true)
    addTierlist('Not pinned', '2026-01-01T10:00:00Z')
    const { wrapper } = await openApp('/tierlists')

    const pinned = wrapper.findAll('.tierlist-card').map((c) => c.find('.pinned-badge').exists())
    expect(listedNames(wrapper)).toEqual(['Pinned picks', 'Not pinned'])
    expect(pinned).toEqual([true, false])
    expect(wrapper.get('.pinned-badge').attributes('aria-label')).toBe('Pinned to profile')
  })

  it('opens a tierlist when clicked', async () => {
    addTierlist('Fresh picks', '2026-09-01T10:00:00Z')
    const { wrapper, router } = await openApp('/tierlists')

    await wrapper.get('.tierlist-card').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/tierlists/1')
  })

  it('invites to create a first tierlist when the user has none', async () => {
    const { wrapper } = await openApp('/tierlists')

    expect(wrapper.get('.empty-title').text()).toBe('No tierlists yet')
  })

  it('explains when the tierlists could not be loaded', async () => {
    api.loadFails = true
    const { wrapper } = await openApp('/tierlists')

    expect(wrapper.get('.empty-title').text()).toBe("Couldn't load your tierlists")
  })

  it('lists a tierlist right after its creation, back from the creation page', async () => {
    addTierlist('Old favorites', '2026-01-01T10:00:00Z')
    const { wrapper, router } = await openApp('/tierlists')

    await wrapper.get('.add-chip').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/tierlists/new')

    await wrapper.get('#tierlist-name').setValue('Sushi spots')
    await wrapper.get('.create-btn').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/tierlists')
    expect(listedNames(wrapper)).toEqual(['Sushi spots', 'Old favorites'])
  })
})
