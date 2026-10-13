import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'
import { fetchUserProfile } from '@/services/userService'

const logout = vi.fn()
const deleteAccount = vi.fn()

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ logout, deleteAccount }),
}))
vi.mock('@/services/userService', () => ({
  ME: 'me',
  fetchUserProfile: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

beforeEach(() => {
  vi.mocked(fetchUserProfile).mockResolvedValue({
    id: 'u1',
    name: 'Alexis Melo',
    avatarUrl: null,
    ratedRestaurantsCount: 2,
  })
})

describe('SettingsView', () => {
  it('logs out through useAuth', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    await wrapper.get('.logout-btn').trigger('click')

    expect(logout).toHaveBeenCalledOnce()
  })

  it("shows the logged-in user's real name", async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    expect(fetchUserProfile).toHaveBeenCalledWith('me')
    expect(wrapper.get('.user-name').text()).toBe('Alexis Melo')
  })

  it('still offers to log out and delete the account when the profile cannot be loaded', async () => {
    vi.mocked(fetchUserProfile).mockRejectedValue(new Error('503'))
    const wrapper = mount(SettingsView)
    await flushPromises()

    expect(wrapper.find('.user-bar').exists()).toBe(false)
    expect(wrapper.find('.logout-btn').exists()).toBe(true)
    expect(wrapper.find('.delete-account-btn').exists()).toBe(true)
  })

  it('asks for confirmation before deleting the account, and can be cancelled', async () => {
    // The popup is teleported to <body>: render it in place to find it in the wrapper
    const wrapper = mount(SettingsView, { global: { stubs: { teleport: true } } })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('.delete-account-btn').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(deleteAccount).not.toHaveBeenCalled()

    await wrapper.get('.cancel-btn').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(deleteAccount).not.toHaveBeenCalled()
  })
})
