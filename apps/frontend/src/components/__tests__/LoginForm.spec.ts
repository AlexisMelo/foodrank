import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginForm from '@/components/LoginForm.vue'

const login = vi.fn()

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ login }) }))

/**
 * Fills the form with `email` and `password`, then submits it.
 */
async function submit(wrapper: ReturnType<typeof mount>, email: string, password: string) {
  await wrapper.get('#login-email').setValue(email)
  await wrapper.get('#login-password').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  login.mockReset()
})

describe('LoginForm', () => {
  it('logs in with the trimmed email', async () => {
    login.mockResolvedValue(undefined)
    const wrapper = mount(LoginForm)

    await submit(wrapper, '  me@test.fr ', 'secret')

    expect(login).toHaveBeenCalledWith('me@test.fr', 'secret')
    expect(wrapper.find('.error').exists()).toBe(false)
  })

  it('shows an error when the login fails', async () => {
    login.mockRejectedValue(new Error('400'))
    const wrapper = mount(LoginForm)

    await submit(wrapper, 'me@test.fr', 'wrong')

    expect(wrapper.get('.error').text()).toBe('Invalid email or password.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('asks to switch to the sign up form', async () => {
    const wrapper = mount(LoginForm)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Sign up')!
      .trigger('click')

    expect(wrapper.emitted('go-to-signup')).toHaveLength(1)
  })

  it('asks to switch to the forgot password form', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.get('.btn-link').trigger('click')

    expect(wrapper.emitted('go-to-forgot')).toHaveLength(1)
  })
})
