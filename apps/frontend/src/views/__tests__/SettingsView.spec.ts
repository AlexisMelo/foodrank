import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'

const logout = vi.fn()

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ currentUserId: 'alex', logout }),
}))
vi.mock('@/services/restaurantService', () => ({
  fetchUserById: vi.fn().mockResolvedValue({ id: 'alex', name: 'Alex', avatar: '🙂', bio: '' }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('SettingsView', () => {
  it('logs out through useAuth', async () => {
    const wrapper = mount(SettingsView)
    await flushPromises()

    await wrapper.get('.logout-btn').trigger('click')

    expect(logout).toHaveBeenCalledOnce()
  })
})
