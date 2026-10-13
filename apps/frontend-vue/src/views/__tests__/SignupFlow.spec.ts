import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import AuthView from '@/views/AuthView.vue'
import { signupStepGuard } from '@/router/signupStepGuard'
import { useSignupDraft } from '@/composables/useSignupDraft'

const login = vi.fn()
const signup = vi.fn()

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ login, signup }) }))

/**
 * Opens `path` in an app holding the login and sign up pages, with the sign up step guard of the real router.
 */
async function openApp(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div class="home-page" />' } },
      { path: '/login', component: AuthView, meta: { access: 'guest' } },
      { path: '/signup', component: AuthView, meta: { access: 'guest' } },
    ],
  })
  router.beforeEach(signupStepGuard)
  router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

/** Current URL of the app, path and query. */
function url(router: Awaited<ReturnType<typeof openApp>>['router']) {
  return router.currentRoute.value.fullPath
}

/** Clicks the button labelled `label`. */
async function clickButton(wrapper: VueWrapper, label: string) {
  await wrapper
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click')
  await flushPromises()
}

async function submit(wrapper: VueWrapper) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  login.mockReset()
  signup.mockReset()
  useSignupDraft().resetDraft()
})

describe('Sign up flow', () => {
  it('gives the login and sign up tabs their own URL, the sign up one on step 1', async () => {
    const { wrapper, router } = await openApp('/login')
    expect(wrapper.find('#login-email').exists()).toBe(true)

    await clickButton(wrapper, 'Sign up')
    expect(url(router)).toBe('/signup?step=1')
    expect(wrapper.find('#signup-email').exists()).toBe(true)

    await clickButton(wrapper, 'Sign in')
    expect(url(router)).toBe('/login')
    expect(wrapper.find('#login-email').exists()).toBe(true)
  })

  it('opens /signup on step 1', async () => {
    const { router } = await openApp('/signup')

    expect(url(router)).toBe('/signup?step=1')
  })

  it('only asks for the email on step 1', async () => {
    const { wrapper } = await openApp('/signup?step=1')

    expect(wrapper.findAll('input').map((i) => i.attributes('id'))).toEqual(['signup-email'])
    expect(wrapper.get('button[type="submit"]').text()).toBe('Create account')
  })

  it('goes through the three steps, then signs up with everything entered', async () => {
    signup.mockResolvedValue(undefined)
    const { wrapper, router } = await openApp('/signup?step=1')

    // Step 1: email
    await wrapper.get('#signup-email').setValue('  me@test.fr ')
    await submit(wrapper)
    expect(url(router)).toBe('/signup?step=2')

    // Step 2: password
    expect(wrapper.get('.step-label').text()).toBe('Step 2')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
    expect(wrapper.get('h1').text()).toBe('Create a password')
    await wrapper.get('#signup-password').setValue('abcdefg1')
    await submit(wrapper)
    expect(url(router)).toBe('/signup?step=3')

    // Step 3: personal data
    expect(wrapper.get('.step-label').text()).toBe('Step 3')
    expect(wrapper.get('h1').text()).toBe('Enter your personal data')
    await wrapper.get('#signup-username').setValue('alex')
    await wrapper.get('#signup-age').setValue(30)
    await wrapper.get('#signup-identity').setValue('non_binary')
    await submit(wrapper)

    expect(signup).toHaveBeenCalledWith({
      email: 'me@test.fr',
      password: 'abcdefg1',
      username: 'alex',
      age: 30,
      identity: 'non_binary',
    })
  })

  it('checks the password criteria while typing, and only continues once all are met', async () => {
    const { wrapper, router } = await openApp('/signup?step=1')
    await wrapper.get('#signup-email').setValue('me@test.fr')
    await submit(wrapper)
    const continueButton = () => wrapper.get('button[type="submit"]')
    const metCriteria = () => wrapper.findAll('.criterion.met').map((c) => c.text())

    expect(wrapper.findAll('.criterion').map((c) => c.text())).toEqual([
      '• At least 8 characters',
      '• At least 1 letter',
      '• At least 1 number',
    ])
    expect(continueButton().attributes('disabled')).toBeDefined()

    await wrapper.get('#signup-password').setValue('abcdefgh')
    expect(metCriteria()).toEqual(['✓ At least 8 characters', '✓ At least 1 letter'])
    expect(continueButton().attributes('disabled')).toBeDefined()
    await submit(wrapper)
    expect(url(router)).toBe('/signup?step=2')

    await wrapper.get('#signup-password').setValue('abcdefg1')
    expect(metCriteria()).toHaveLength(3)
    expect(continueButton().attributes('disabled')).toBeUndefined()
  })

  it('goes back step by step with the arrows, keeping what was entered', async () => {
    const { wrapper, router } = await openApp('/signup?step=1')
    await wrapper.get('#signup-email').setValue('me@test.fr')
    await submit(wrapper)
    await wrapper.get('#signup-password').setValue('abcdefg1')
    await submit(wrapper)

    await wrapper.get('.back-link').trigger('click')
    await flushPromises()
    expect(url(router)).toBe('/signup?step=2')
    expect((wrapper.get('#signup-password').element as HTMLInputElement).value).toBe('abcdefg1')

    await wrapper.get('.back-link').trigger('click')
    await flushPromises()
    expect(url(router)).toBe('/signup?step=1')
    expect((wrapper.get('#signup-email').element as HTMLInputElement).value).toBe('me@test.fr')
  })

  it('opens the first step missing when a later step is opened directly (e.g. after a reload)', async () => {
    const { router } = await openApp('/signup?step=3')
    expect(url(router)).toBe('/signup?step=1')

    useSignupDraft().draft.email = 'me@test.fr'
    await router.push('/signup?step=3')
    expect(url(router)).toBe('/signup?step=2')
  })
})
