import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import NewReviewView from '@/views/NewReviewView.vue'
import { rateRestaurant } from '@/services/ratingService'

const push = vi.fn()
const replace = vi.fn()

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ currentUserId: 'alex' }) }))
vi.mock('@/services/restaurantService', () => ({
  fetchRestaurantById: vi.fn().mockResolvedValue({ id: 'r1', name: 'Pizza Roma', emoji: '🍕' }),
  fetchRestaurants: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/services/ratingService', () => ({
  fetchCommunityVisitsByUserId: vi.fn().mockResolvedValue([]),
  rateRestaurant: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'r1' } }),
  useRouter: () => ({ push, replace }),
}))

/**
 * Builds the error axios throws when the API answers with `status`.
 */
function httpError(status: number): AxiosError {
  return new AxiosError('HTTP error', String(status), undefined, undefined, {
    status,
  } as AxiosResponse)
}

/**
 * Mounts the page and waits for the restaurant to be loaded.
 */
async function mountPage() {
  const wrapper = mount(NewReviewView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  push.mockReset()
  vi.mocked(rateRestaurant).mockReset()
})

describe('NewReviewView', () => {
  it('saves the slider values and the instant crush, then opens the restaurant page', async () => {
    vi.mocked(rateRestaurant).mockResolvedValue()
    const wrapper = await mountPage()

    const [food, service, decor] = wrapper.findAll('input[type="range"]')
    await food!.setValue('80')
    await service!.setValue('35')
    await decor!.setValue('12')
    await wrapper.get('.crush-toggle').trigger('click')
    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    expect(rateRestaurant).toHaveBeenCalledWith('r1', {
      food: 80,
      service: 35,
      setting: 12,
      bonus: true,
    })
    expect(push).toHaveBeenCalledWith('/restaurant/r1')
  })

  it('stays on the page and explains when the restaurant was already rated today', async () => {
    vi.mocked(rateRestaurant).mockRejectedValue(httpError(409))
    const wrapper = await mountPage()

    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    expect(wrapper.get('.save-error').text()).toBe('You already rated this restaurant today.')
    expect(push).not.toHaveBeenCalled()
  })

  it('asks to log in when the session expired', async () => {
    vi.mocked(rateRestaurant).mockRejectedValue(httpError(401))
    const wrapper = await mountPage()

    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    expect(wrapper.get('.save-error').text()).toBe('Log in to rate this restaurant.')
  })

  it('shows a generic error when the API fails', async () => {
    vi.mocked(rateRestaurant).mockRejectedValue(httpError(503))
    const wrapper = await mountPage()

    await wrapper.get('.submit-btn').trigger('click')
    await flushPromises()

    expect(wrapper.get('.save-error').text()).toBe('Could not save your rating, try again.')
  })

  it('disables the button while saving, so the rating is not sent twice', async () => {
    let resolveSave!: () => void
    vi.mocked(rateRestaurant).mockReturnValue(new Promise<void>((r) => (resolveSave = r)))
    const wrapper = await mountPage()

    await wrapper.get('.submit-btn').trigger('click')
    expect(wrapper.get('.submit-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('.submit-btn').trigger('click')

    resolveSave()
    await flushPromises()
    expect(rateRestaurant).toHaveBeenCalledOnce()
    expect(wrapper.get('.submit-btn').attributes('disabled')).toBeUndefined()
  })
})
